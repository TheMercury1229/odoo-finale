import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  contact,
  customerInvoice,
  product,
  salesOrder,
  salesOrderLine,
} from "../db/schema.js";

function soScope(organizationId, id) {
  return and(
    eq(salesOrder.organizationId, organizationId),
    or(eq(salesOrder.id, id), eq(salesOrder.soNumber, id)),
  );
}

/**
 * Validates customer exists in org, is unarchived, and is type 'customer' or 'both'.
 */
async function validateCustomer(organizationId, customerId, tx) {
  const executor = tx || db;
  const [c] = await executor
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
        eq(contact.id, customerId),
      ),
    )
    .limit(1);

  if (!c) {
    return {
      error: "Customer not found in this organization",
      field: "customerId",
      status: 400,
    };
  }

  if (c.isArchived) {
    return {
      error: `Customer "${c.name}" is archived and cannot be used for new sales orders`,
      field: "customerId",
      status: 400,
    };
  }

  if (c.type !== "customer" && c.type !== "both") {
    return {
      error: `Contact "${c.name}" has type "${c.type}". Sales orders can only be issued to customers.`,
      field: "customerId",
      status: 400,
    };
  }

  return { customer: c };
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
        error: `Product "${p.name}" is archived and cannot be used on sales orders`,
        field: "lines",
        status: 400,
      };
    }
  }

  return { productMap };
}

export async function createSalesOrder(req, res, next) {
  try {
    const { customerId, orderDate, lines } = req.validatedBody;
    const organizationId = req.organizationId;
    const createdBy = req.session.user.id;

    // 1. Validate customer
    const customerCheck = await validateCustomer(organizationId, customerId);
    if (customerCheck.error) {
      return res.status(customerCheck.status).json({
        error: customerCheck.error,
        field: customerCheck.field,
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

    // 3. Atomically count existing SOs for this org, generate sequence, and insert
    const result = await db.transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(salesOrder)
        .where(eq(salesOrder.organizationId, organizationId));

      const seq = Number(count) + 1;
      const soNumber = `SO${String(seq).padStart(4, "0")}`;
      const soId = `so_${randomUUID()}`;

      const [createdSo] = await tx
        .insert(salesOrder)
        .values({
          id: soId,
          organizationId,
          soNumber,
          customerId,
          status: "draft",
          orderDate,
          createdBy,
        })
        .returning();

      const lineInserts = lines.map((line) => ({
        id: `sol_${randomUUID()}`,
        salesOrderId: soId,
        productId: line.productId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        taxAmount: String(Number(line.taxAmount || 0)),
      }));

      const createdLines = await tx
        .insert(salesOrderLine)
        .values(lineInserts)
        .returning();

      let subtotal = 0;
      let totalTax = 0;

      const formattedLines = createdLines.map((line) => {
        const prod = productCheck.productMap.get(line.productId);
        const qty = Number(line.quantity);
        const price = Number(line.unitPrice);
        const tax = Number(line.taxAmount || 0);
        const lineSubtotal = Math.round(qty * price * 100) / 100;
        const lineTotal = Math.round((lineSubtotal + tax) * 100) / 100;

        subtotal += lineSubtotal;
        totalTax += tax;

        return {
          id: line.id,
          salesOrderId: line.salesOrderId,
          productId: line.productId,
          productName: prod?.name || null,
          productType: prod?.type || null,
          productCategory: prod?.category || null,
          quantity: qty,
          unitPrice: price,
          taxAmount: tax,
          subtotal: lineSubtotal,
          total: lineTotal,
        };
      });

      subtotal = Math.round(subtotal * 100) / 100;
      totalTax = Math.round(totalTax * 100) / 100;
      const total = Math.round((subtotal + totalTax) * 100) / 100;

      return {
        id: createdSo.id,
        soNumber: createdSo.soNumber,
        organizationId: createdSo.organizationId,
        customerId: createdSo.customerId,
        customerName: customerCheck.customer.name,
        customer: customerCheck.customer,
        status: createdSo.status,
        orderDate: createdSo.orderDate,
        createdBy: createdSo.createdBy,
        createdAt: createdSo.createdAt,
        lines: formattedLines,
        subtotal,
        totalTax,
        total,
        hasInvoice: false,
        invoiceId: null,
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listSalesOrders(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const filters = [eq(salesOrder.organizationId, organizationId)];

    if (req.query.status && typeof req.query.status === "string") {
      filters.push(eq(salesOrder.status, req.query.status.trim()));
    }

    if (req.query.search && typeof req.query.search === "string") {
      const search = `%${req.query.search.trim()}%`;
      filters.push(
        or(
          ilike(salesOrder.soNumber, search),
          ilike(contact.name, search),
        ),
      );
    }

    const rows = await db
      .select({
        id: salesOrder.id,
        soNumber: salesOrder.soNumber,
        customerId: salesOrder.customerId,
        customerName: contact.name,
        orderDate: salesOrder.orderDate,
        status: salesOrder.status,
        createdAt: salesOrder.createdAt,
        total:
          sql`coalesce(sum(${salesOrderLine.quantity} * ${salesOrderLine.unitPrice} + ${salesOrderLine.taxAmount}), 0)`.as(
            "total",
          ),
      })
      .from(salesOrder)
      .leftJoin(contact, eq(salesOrder.customerId, contact.id))
      .leftJoin(
        salesOrderLine,
        eq(salesOrder.id, salesOrderLine.salesOrderId),
      )
      .where(and(...filters))
      .groupBy(
        salesOrder.id,
        salesOrder.soNumber,
        salesOrder.customerId,
        contact.name,
        salesOrder.orderDate,
        salesOrder.status,
        salesOrder.createdAt,
      )
      .orderBy(desc(salesOrder.orderDate), desc(salesOrder.createdAt));

    const salesOrders = rows.map((r) => ({
      id: r.id,
      soNumber: r.soNumber,
      customerId: r.customerId,
      customerName: r.customerName || "—",
      orderDate: r.orderDate,
      status: r.status,
      total: Math.round(Number(r.total) * 100) / 100,
      createdAt: r.createdAt,
    }));

    return res.json({ salesOrders });
  } catch (error) {
    return next(error);
  }
}

export async function getSalesOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const soId = req.params.id;

    const [so] = await db
      .select({
        id: salesOrder.id,
        soNumber: salesOrder.soNumber,
        organizationId: salesOrder.organizationId,
        customerId: salesOrder.customerId,
        status: salesOrder.status,
        orderDate: salesOrder.orderDate,
        createdBy: salesOrder.createdBy,
        createdAt: salesOrder.createdAt,
        customerName: contact.name,
        customerEmail: contact.email,
        customerMobile: contact.mobile,
        customerCity: contact.addressCity,
        customerState: contact.addressState,
        customerPincode: contact.addressPincode,
        customerProfileImage: contact.profileImageUrl,
      })
      .from(salesOrder)
      .leftJoin(contact, eq(salesOrder.customerId, contact.id))
      .where(soScope(organizationId, soId))
      .limit(1);

    if (!so) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    // Fetch lines with product details
    const lineRows = await db
      .select({
        id: salesOrderLine.id,
        salesOrderId: salesOrderLine.salesOrderId,
        productId: salesOrderLine.productId,
        productName: product.name,
        productType: product.type,
        productCategory: product.category,
        quantity: salesOrderLine.quantity,
        unitPrice: salesOrderLine.unitPrice,
        taxAmount: salesOrderLine.taxAmount,
      })
      .from(salesOrderLine)
      .leftJoin(product, eq(salesOrderLine.productId, product.id))
      .where(eq(salesOrderLine.salesOrderId, so.id))
      .orderBy(asc(salesOrderLine.id));

    let subtotal = 0;
    let totalTax = 0;

    const lines = lineRows.map((line) => {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);
      const lineSubtotal = Math.round(qty * price * 100) / 100;
      const lineTotal = Math.round((lineSubtotal + tax) * 100) / 100;

      subtotal += lineSubtotal;
      totalTax += tax;

      return {
        id: line.id,
        salesOrderId: line.salesOrderId,
        productId: line.productId,
        productName: line.productName || "Unknown Product",
        productType: line.productType || null,
        productCategory: line.productCategory || null,
        quantity: qty,
        unitPrice: price,
        taxAmount: tax,
        subtotal: lineSubtotal,
        total: lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const total = Math.round((subtotal + totalTax) * 100) / 100;

    // Check if a customer invoice exists for this SO
    const [existingInvoice] = await db
      .select({ id: customerInvoice.id })
      .from(customerInvoice)
      .where(
        and(
          eq(customerInvoice.organizationId, organizationId),
          eq(customerInvoice.salesOrderId, so.id),
        ),
      )
      .limit(1);

    return res.json({
      id: so.id,
      soNumber: so.soNumber,
      organizationId: so.organizationId,
      customerId: so.customerId,
      customerName: so.customerName || "—",
      customer: {
        id: so.customerId,
        name: so.customerName,
        email: so.customerEmail,
        mobile: so.customerMobile,
        addressCity: so.customerCity,
        addressState: so.customerState,
        addressPincode: so.customerPincode,
        profileImageUrl: so.customerProfileImage,
      },
      status: so.status,
      orderDate: so.orderDate,
      createdBy: so.createdBy,
      createdAt: so.createdAt,
      lines,
      subtotal,
      totalTax,
      total,
      hasInvoice: Boolean(existingInvoice),
      invoiceId: existingInvoice ? existingInvoice.id : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSalesOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const soId = req.params.id;
    const { customerId, orderDate, lines } = req.validatedBody;

    // 1. Fetch existing SO
    const [existing] = await db
      .select()
      .from(salesOrder)
      .where(soScope(organizationId, soId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (existing.status !== "draft") {
      return res
        .status(400)
        .json({ error: `Cannot edit a ${existing.status} sales order` });
    }

    // 2. Validate customer if changed
    if (customerId) {
      const customerCheck = await validateCustomer(organizationId, customerId);
      if (customerCheck.error) {
        return res.status(customerCheck.status).json({
          error: customerCheck.error,
          field: customerCheck.field,
        });
      }
    }

    // 3. Validate products if lines changed
    if (lines) {
      const productCheck = await validateProducts(organizationId, lines);
      if (productCheck.error) {
        return res.status(productCheck.status).json({
          error: productCheck.error,
          field: productCheck.field,
        });
      }
    }

    // 4. Update in transaction
    await db.transaction(async (tx) => {
      const updateData = {};
      if (customerId) updateData.customerId = customerId;
      if (orderDate) updateData.orderDate = orderDate;

      if (Object.keys(updateData).length > 0) {
        await tx
          .update(salesOrder)
          .set(updateData)
          .where(eq(salesOrder.id, existing.id));
      }

      if (lines) {
        // Delete old lines
        await tx
          .delete(salesOrderLine)
          .where(eq(salesOrderLine.salesOrderId, existing.id));

        // Insert new lines
        const lineInserts = lines.map((l) => ({
          id: `sol_${randomUUID()}`,
          salesOrderId: existing.id,
          productId: l.productId,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          taxAmount: String(Number(l.taxAmount || 0)),
        }));

        await tx.insert(salesOrderLine).values(lineInserts);
      }
    });

    // Re-fetch and return updated SO detail
    req.params.id = existing.id;
    return getSalesOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function confirmSalesOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const soId = req.params.id;

    const [existing] = await db
      .select()
      .from(salesOrder)
      .where(soScope(organizationId, soId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({
        error: `Cannot confirm a sales order with status '${existing.status}'`,
      });
    }

    const [updated] = await db
      .update(salesOrder)
      .set({ status: "confirmed" })
      .where(eq(salesOrder.id, existing.id))
      .returning();

    req.params.id = updated.id;
    return getSalesOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function cancelSalesOrder(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const soId = req.params.id;

    const [existing] = await db
      .select()
      .from(salesOrder)
      .where(soScope(organizationId, soId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (existing.status === "cancelled") {
      return res.status(400).json({
        error: "Sales order is already cancelled",
      });
    }

    // Check if a customer invoice has already been created for this SO
    const [existingInvoice] = await db
      .select({ id: customerInvoice.id })
      .from(customerInvoice)
      .where(
        and(
          eq(customerInvoice.organizationId, organizationId),
          eq(customerInvoice.salesOrderId, existing.id),
        ),
      )
      .limit(1);

    if (existingInvoice) {
      return res.status(400).json({
        error: "Cannot cancel a sales order that has already been invoiced",
      });
    }

    const [updated] = await db
      .update(salesOrder)
      .set({ status: "cancelled" })
      .where(eq(salesOrder.id, existing.id))
      .returning();

    req.params.id = updated.id;
    return getSalesOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}
