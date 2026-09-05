import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  analyticAccount,
  contact,
  product,
  purchaseOrder,
  purchaseOrderLine,
  vendorBill,
} from "../db/schema.js";

function poScope(organizationId, id) {
  return and(
    eq(purchaseOrder.organizationId, organizationId),
    or(eq(purchaseOrder.id, id), eq(purchaseOrder.poNumber, id)),
  );
}

/**
 * Validates vendor exists in org, is unarchived, and is vendor or both.
 */
async function validateVendor(organizationId, vendorId, tx) {
  const executor = tx || db;
  const [v] = await executor
    .select({
      id: contact.id,
      name: contact.name,
      type: contact.type,
      isArchived: contact.isArchived,
      email: contact.email,
      mobile: contact.mobile,
      addressCity: contact.addressCity,
      addressState: contact.addressState,
      addressPincode: contact.addressPincode,
      profileImageUrl: contact.profileImageUrl,
    })
    .from(contact)
    .where(
      and(
        eq(contact.organizationId, organizationId),
        eq(contact.id, vendorId),
      ),
    )
    .limit(1);

  if (!v) {
    return {
      error: "Vendor not found in this organization",
      field: "vendorId",
      status: 400,
    };
  }

  if (v.isArchived) {
    return {
      error: `Vendor "${v.name}" is archived and cannot be used for new purchase orders`,
      field: "vendorId",
      status: 400,
    };
  }

  if (v.type !== "vendor" && v.type !== "both") {
    return {
      error: `Contact "${v.name}" has type "${v.type}". Purchase orders can only be issued to vendors.`,
      field: "vendorId",
      status: 400,
    };
  }

  return { vendor: v };
}

/**
 * Validates all products in lines exist in org and are not archived.
 */
async function validateProducts(organizationId, lines, tx) {
  const executor = tx || db;
  const uniqueProductIds = [...new Set(lines.map((l) => l.productId))];

  const products = await executor
    .select({
      id: product.id,
      name: product.name,
      type: product.type,
      category: product.category,
      isArchived: product.isArchived,
    })
    .from(product)
    .where(
      and(
        eq(product.organizationId, organizationId),
        inArray(product.id, uniqueProductIds),
      ),
    );

  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const pId of uniqueProductIds) {
    const p = productMap.get(pId);
    if (!p) {
      return {
        error: `Product '${pId}' not found in this organization`,
        field: "lines",
        status: 400,
      };
    }
    if (p.isArchived) {
      return {
        error: `Product "${p.name}" is archived and cannot be used on purchase orders`,
        field: "lines",
        status: 400,
      };
    }
  }

  return { productMap };
}

export async function createPurchaseOrder(req, res, next) {
  try {
    const { vendorId, orderDate, lines } = req.validatedBody;
    const organizationId = req.organizationId;
    const createdBy = req.session.user.id;

    // 1. Validate vendor
    const vendorCheck = await validateVendor(organizationId, vendorId);
    if (vendorCheck.error) {
      return res.status(vendorCheck.status).json({
        error: vendorCheck.error,
        field: vendorCheck.field,
      });
    }

    // 2. Validate products
    const productCheck = await validateProducts(organizationId, lines);
    if (productCheck.error) {
      return res.status(productCheck.status).json({
        error: productCheck.error,
        field: productCheck.field,
      });
    }

    // 3. Atomically count existing POs for this org, generate sequence, and insert
    const result = await db.transaction(async (tx) => {
      // Lock or count existing POs for this org
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(purchaseOrder)
        .where(eq(purchaseOrder.organizationId, organizationId));

      const seq = Number(count) + 1;
      const poNumber = `PO${String(seq).padStart(4, "0")}`;
      const poId = `po_${randomUUID()}`;

      const [createdPo] = await tx
        .insert(purchaseOrder)
        .values({
          id: poId,
          organizationId,
          poNumber,
          vendorId,
          status: "draft",
          orderDate,
          createdBy,
        })
        .returning();

      const lineInserts = lines.map((line) => ({
        id: `pol_${randomUUID()}`,
        purchaseOrderId: poId,
        productId: line.productId,
        analyticAccountId: line.analyticAccountId || null,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
      }));

      const createdLines = await tx
        .insert(purchaseOrderLine)
        .values(lineInserts)
        .returning();

      let total = 0;
      const formattedLines = createdLines.map((line) => {
        const prod = productCheck.productMap.get(line.productId);
        const qty = Number(line.quantity);
        const price = Number(line.unitPrice);
        const subtotal = Math.round(qty * price * 100) / 100;
        total += subtotal;

        return {
          id: line.id,
          purchaseOrderId: line.purchaseOrderId,
          productId: line.productId,
          productName: prod?.name || null,
          productType: prod?.type || null,
          productCategory: prod?.category || null,
          quantity: qty,
          unitPrice: price,
          subtotal,
        };
      });

      total = Math.round(total * 100) / 100;

      return {
        id: createdPo.id,
        poNumber: createdPo.poNumber,
        organizationId: createdPo.organizationId,
        vendorId: createdPo.vendorId,
        vendorName: vendorCheck.vendor.name,
        vendor: vendorCheck.vendor,
        status: createdPo.status,
        orderDate: createdPo.orderDate,
        createdBy: createdPo.createdBy,
        createdAt: createdPo.createdAt,
        lines: formattedLines,
        total,
        hasBill: false,
        billId: null,
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listPurchaseOrders(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const filters = [eq(purchaseOrder.organizationId, organizationId)];

    if (req.query.status && typeof req.query.status === "string") {
      filters.push(eq(purchaseOrder.status, req.query.status.trim()));
    }

    if (req.query.search && typeof req.query.search === "string") {
      const search = `%${req.query.search.trim()}%`;
      filters.push(
        or(
          ilike(purchaseOrder.poNumber, search),
          ilike(contact.name, search),
        ),
      );
    }

    const rows = await db
      .select({
        id: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        vendorId: purchaseOrder.vendorId,
        vendorName: contact.name,
        orderDate: purchaseOrder.orderDate,
        status: purchaseOrder.status,
        createdAt: purchaseOrder.createdAt,
        total:
          sql`coalesce(sum(${purchaseOrderLine.quantity} * ${purchaseOrderLine.unitPrice}), 0)`.as(
            "total",
          ),
      })
      .from(purchaseOrder)
      .leftJoin(contact, eq(purchaseOrder.vendorId, contact.id))
      .leftJoin(
        purchaseOrderLine,
        eq(purchaseOrder.id, purchaseOrderLine.purchaseOrderId),
      )
      .where(and(...filters))
      .groupBy(
        purchaseOrder.id,
        purchaseOrder.poNumber,
        purchaseOrder.vendorId,
        contact.name,
        purchaseOrder.orderDate,
        purchaseOrder.status,
        purchaseOrder.createdAt,
      )
      .orderBy(desc(purchaseOrder.orderDate), desc(purchaseOrder.createdAt));

    const purchaseOrders = rows.map((r) => ({
      id: r.id,
      poNumber: r.poNumber,
      vendorId: r.vendorId,
      vendorName: r.vendorName || "—",
      orderDate: r.orderDate,
      status: r.status,
      total: Math.round(Number(r.total) * 100) / 100,
      createdAt: r.createdAt,
    }));

    return res.json({ purchaseOrders });
  } catch (error) {
    return next(error);
  }
}

export async function getPurchaseOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const poId = req.params.id;

    const [po] = await db
      .select({
        id: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        organizationId: purchaseOrder.organizationId,
        vendorId: purchaseOrder.vendorId,
        status: purchaseOrder.status,
        orderDate: purchaseOrder.orderDate,
        createdBy: purchaseOrder.createdBy,
        createdAt: purchaseOrder.createdAt,
        vendorName: contact.name,
        vendorEmail: contact.email,
        vendorMobile: contact.mobile,
        vendorCity: contact.addressCity,
        vendorState: contact.addressState,
        vendorPincode: contact.addressPincode,
        vendorProfileImage: contact.profileImageUrl,
      })
      .from(purchaseOrder)
      .leftJoin(contact, eq(purchaseOrder.vendorId, contact.id))
      .where(poScope(organizationId, poId))
      .limit(1);

    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    // Fetch lines with product details and analytic account
    const lineRows = await db
      .select({
        id: purchaseOrderLine.id,
        purchaseOrderId: purchaseOrderLine.purchaseOrderId,
        productId: purchaseOrderLine.productId,
        productName: product.name,
        productType: product.type,
        productCategory: product.category,
        analyticAccountId: purchaseOrderLine.analyticAccountId,
        analyticAccountName: analyticAccount.name,
        quantity: purchaseOrderLine.quantity,
        unitPrice: purchaseOrderLine.unitPrice,
      })
      .from(purchaseOrderLine)
      .leftJoin(product, eq(purchaseOrderLine.productId, product.id))
      .leftJoin(analyticAccount, eq(purchaseOrderLine.analyticAccountId, analyticAccount.id))
      .where(eq(purchaseOrderLine.purchaseOrderId, po.id))
      .orderBy(asc(purchaseOrderLine.id));

    let total = 0;
    const lines = lineRows.map((line) => {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const subtotal = Math.round(qty * price * 100) / 100;
      total += subtotal;

      return {
        id: line.id,
        purchaseOrderId: line.purchaseOrderId,
        productId: line.productId,
        productName: line.productName || "Unknown Product",
        productType: line.productType || null,
        productCategory: line.productCategory || null,
        analyticAccountId: line.analyticAccountId || null,
        analyticAccountName: line.analyticAccountName || null,
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    total = Math.round(total * 100) / 100;

    // Check if a vendor bill exists for this PO
    const [existingBill] = await db
      .select({ id: vendorBill.id })
      .from(vendorBill)
      .where(
        and(
          eq(vendorBill.organizationId, organizationId),
          eq(vendorBill.purchaseOrderId, po.id),
        ),
      )
      .limit(1);

    return res.json({
      id: po.id,
      poNumber: po.poNumber,
      organizationId: po.organizationId,
      vendorId: po.vendorId,
      vendorName: po.vendorName || "—",
      vendor: {
        id: po.vendorId,
        name: po.vendorName,
        email: po.vendorEmail,
        mobile: po.vendorMobile,
        addressCity: po.vendorCity,
        addressState: po.vendorState,
        addressPincode: po.vendorPincode,
        profileImageUrl: po.vendorProfileImage,
      },
      status: po.status,
      orderDate: po.orderDate,
      createdBy: po.createdBy,
      createdAt: po.createdAt,
      lines,
      total,
      hasBill: Boolean(existingBill),
      billId: existingBill ? existingBill.id : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePurchaseOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const poId = req.params.id;
    const { vendorId, orderDate, lines } = req.validatedBody;

    // 1. Fetch existing PO
    const [existing] = await db
      .select()
      .from(purchaseOrder)
      .where(poScope(organizationId, poId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (existing.status !== "draft") {
      return res
        .status(400)
        .json({ error: "Cannot edit a confirmed purchase order" });
    }

    // 2. Validate vendor if changed
    let vendor = null;
    if (vendorId) {
      const vendorCheck = await validateVendor(organizationId, vendorId);
      if (vendorCheck.error) {
        return res.status(vendorCheck.status).json({
          error: vendorCheck.error,
          field: vendorCheck.field,
        });
      }
      vendor = vendorCheck.vendor;
    }

    // 3. Validate products if lines changed
    let productMap = null;
    if (lines) {
      const productCheck = await validateProducts(organizationId, lines);
      if (productCheck.error) {
        return res.status(productCheck.status).json({
          error: productCheck.error,
          field: productCheck.field,
        });
      }
      productMap = productCheck.productMap;
    }

    // 4. Update in transaction
    await db.transaction(async (tx) => {
      const updateData = {};
      if (vendorId) updateData.vendorId = vendorId;
      if (orderDate) updateData.orderDate = orderDate;

      if (Object.keys(updateData).length > 0) {
        await tx
          .update(purchaseOrder)
          .set(updateData)
          .where(eq(purchaseOrder.id, existing.id));
      }

      if (lines) {
        // Delete old lines
        await tx
          .delete(purchaseOrderLine)
          .where(eq(purchaseOrderLine.purchaseOrderId, existing.id));

        // Insert new lines
        const lineInserts = lines.map((l) => ({
          id: `pol_${randomUUID()}`,
          purchaseOrderId: existing.id,
          productId: l.productId,
          analyticAccountId: l.analyticAccountId || null,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
        }));

        await tx.insert(purchaseOrderLine).values(lineInserts);
      }
    });

    // Re-fetch and return updated PO detail
    req.params.id = existing.id;
    return getPurchaseOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function confirmPurchaseOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const poId = req.params.id;

    const [existing] = await db
      .select()
      .from(purchaseOrder)
      .where(poScope(organizationId, poId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({
        error: `Cannot confirm a purchase order with status '${existing.status}'`,
      });
    }

    const [updated] = await db
      .update(purchaseOrder)
      .set({ status: "confirmed" })
      .where(eq(purchaseOrder.id, existing.id))
      .returning();

    req.params.id = updated.id;
    return getPurchaseOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function cancelPurchaseOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const poId = req.params.id;

    const [existing] = await db
      .select()
      .from(purchaseOrder)
      .where(poScope(organizationId, poId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (existing.status === "cancelled") {
      return res.status(400).json({
        error: "Purchase order is already cancelled",
      });
    }

    // Check if a vendor bill has already been created for this PO
    const [existingBill] = await db
      .select({ id: vendorBill.id })
      .from(vendorBill)
      .where(
        and(
          eq(vendorBill.organizationId, organizationId),
          eq(vendorBill.purchaseOrderId, existing.id),
        ),
      )
      .limit(1);

    if (existingBill) {
      return res.status(400).json({
        error: "Cannot cancel a purchase order that has already been billed",
      });
    }

    const [updated] = await db
      .update(purchaseOrder)
      .set({ status: "cancelled" })
      .where(eq(purchaseOrder.id, existing.id))
      .returning();

    req.params.id = updated.id;
    return getPurchaseOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}
