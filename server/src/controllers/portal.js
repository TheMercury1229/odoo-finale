import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  customerInvoice,
  payment,
  product,
  purchaseOrder,
  purchaseOrderLine,
  salesOrder,
  salesOrderLine,
  vendorBill,
} from "../db/schema.js";
import { computeBillStatus } from "./vendor-bills.js";
import { computeInvoiceStatus } from "./customer-invoices.js";

/**
 * GET /api/portal/bills
 * Scoped strictly to the logged-in contact's own vendor bills.
 * Only meaningful if the contact's type is "vendor" or "both".
 * Returns an empty array if contact's type is "customer" only.
 */
export async function getPortalBills(req, res, next) {
  try {
    const { organizationId, contact } = req;
    const { search, status } = req.query;

    // Contact must be a vendor or both
    if (contact.type !== "vendor" && contact.type !== "both") {
      return res.json([]);
    }

    // Subquery to aggregate amount paid per bill in this org
    const paymentSubquery = db
      .select({
        vendorBillId: payment.vendorBillId,
        amountPaid:
          sql`coalesce(sum(${payment.amount}), 0)::numeric`.as("amount_paid"),
      })
      .from(payment)
      .where(eq(payment.organizationId, organizationId))
      .groupBy(payment.vendorBillId)
      .as("payment_sub");

    // Critical security: strictly scope by current contact's id and organizationId
    const filters = [
      eq(vendorBill.organizationId, organizationId),
      eq(vendorBill.vendorId, contact.id),
    ];

    if (typeof search === "string" && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      filters.push(
        or(
          ilike(vendorBill.billNumber, searchPattern),
          ilike(vendorBill.vendorReference, searchPattern),
        ),
      );
    }

    const rows = await db
      .select({
        id: vendorBill.id,
        billNumber: vendorBill.billNumber,
        vendorReference: vendorBill.vendorReference,
        invoiceDate: vendorBill.invoiceDate,
        dueDate: vendorBill.dueDate,
        totalAmount: vendorBill.totalAmount,
        createdAt: vendorBill.createdAt,
        amountPaidRaw: paymentSubquery.amountPaid,
      })
      .from(vendorBill)
      .leftJoin(paymentSubquery, eq(vendorBill.id, paymentSubquery.vendorBillId))
      .where(and(...filters))
      .orderBy(desc(vendorBill.createdAt));

    let bills = rows.map((r) => {
      const totalAmount = Number(r.totalAmount);
      const amountPaid = Math.round(Number(r.amountPaidRaw || 0) * 100) / 100;
      const amountDue = Math.max(
        0,
        Math.round((totalAmount - amountPaid) * 100) / 100,
      );
      const computedStatus = computeBillStatus(totalAmount, amountDue);

      return {
        id: r.id,
        billNumber: r.billNumber,
        vendorReference: r.vendorReference,
        invoiceDate: r.invoiceDate,
        dueDate: r.dueDate,
        totalAmount,
        amountPaid,
        amountDue,
        status: computedStatus,
      };
    });

    if (typeof status === "string" && status.trim() && status !== "all") {
      const targetStatus = status.trim().toLowerCase();
      bills = bills.filter((b) => b.status.toLowerCase() === targetStatus);
    }

    return res.json(bills);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/portal/bills/:id
 * Retrieves full details for a single vendor bill belonging to the logged-in contact.
 * Returns 404 if not found or if the bill belongs to another contact.
 */
export async function getPortalBill(req, res, next) {
  try {
    const { organizationId, contact } = req;
    const { id } = req.params;

    // Must match both organizationId and contact.id (vendorId)
    const [billRow] = await db
      .select({
        bill: vendorBill,
        po: purchaseOrder,
      })
      .from(vendorBill)
      .leftJoin(purchaseOrder, eq(vendorBill.purchaseOrderId, purchaseOrder.id))
      .where(
        and(
          eq(vendorBill.organizationId, organizationId),
          eq(vendorBill.vendorId, contact.id),
          or(eq(vendorBill.id, id), eq(vendorBill.billNumber, id)),
        ),
      )
      .limit(1);

    if (!billRow) {
      // 404 Not Found (do not return 403 to prevent revealing record existence)
      return res.status(404).json({ error: "Vendor bill not found" });
    }

    const { bill, po } = billRow;

    // Fetch lines from linked purchase order
    let lines = [];
    if (bill.purchaseOrderId) {
      const poLines = await db
        .select({
          line: purchaseOrderLine,
          product: product,
        })
        .from(purchaseOrderLine)
        .leftJoin(product, eq(purchaseOrderLine.productId, product.id))
        .where(eq(purchaseOrderLine.purchaseOrderId, bill.purchaseOrderId));

      lines = poLines.map((row) => {
        const qty = Number(row.line.quantity);
        const price = Number(row.line.unitPrice);
        const total = Math.round(qty * price * 100) / 100;
        return {
          id: row.line.id,
          productId: row.line.productId,
          product: row.product?.name || null,
          productName: row.product?.name || null,
          quantity: qty,
          unitPrice: price,
          total,
        };
      });
    }

    // Fetch payments list made against this bill
    const paymentRows = await db
      .select({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        direction: payment.direction,
        method: payment.method,
        amount: payment.amount,
        date: payment.date,
        createdAt: payment.createdAt,
      })
      .from(payment)
      .where(
        and(
          eq(payment.organizationId, organizationId),
          eq(payment.vendorBillId, bill.id),
        ),
      )
      .orderBy(desc(payment.date));

    let amountPaid = 0;
    const payments = paymentRows.map((p) => {
      const amt = Number(p.amount);
      amountPaid += amt;
      return {
        id: p.id,
        paymentNumber: p.paymentNumber,
        direction: p.direction,
        method: p.method,
        amount: amt,
        date: p.date,
        createdAt: p.createdAt,
      };
    });

    amountPaid = Math.round(amountPaid * 100) / 100;
    const totalAmount = Number(bill.totalAmount);
    const amountDue = Math.max(
      0,
      Math.round((totalAmount - amountPaid) * 100) / 100,
    );
    const computedStatus = computeBillStatus(totalAmount, amountDue);

    return res.json({
      id: bill.id,
      billNumber: bill.billNumber,
      vendorReference: bill.vendorReference,
      purchaseOrderId: bill.purchaseOrderId,
      poNumber: po?.poNumber || null,
      poDate: po?.orderDate || null,
      vendorId: bill.vendorId,
      invoiceDate: bill.invoiceDate,
      dueDate: bill.dueDate,
      totalAmount,
      amountPaid,
      amountDue,
      status: computedStatus,
      lines,
      payments,
      createdAt: bill.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/portal/invoices
 * Scoped strictly to the logged-in contact's own customer invoices.
 * Only meaningful if the contact's type is "customer" or "both".
 * Returns an empty array if contact's type is "vendor" only.
 */
export async function getPortalInvoices(req, res, next) {
  try {
    const { organizationId, contact } = req;
    const { search, status } = req.query;

    // Contact must be a customer or both
    if (contact.type !== "customer" && contact.type !== "both") {
      return res.json([]);
    }

    // Subquery to aggregate amount paid per invoice in this org
    const paymentSubquery = db
      .select({
        customerInvoiceId: payment.customerInvoiceId,
        amountPaid:
          sql`coalesce(sum(${payment.amount}), 0)::numeric`.as("amount_paid"),
      })
      .from(payment)
      .where(eq(payment.organizationId, organizationId))
      .groupBy(payment.customerInvoiceId)
      .as("payment_sub");

    // Critical security: strictly scope by current contact's id and organizationId
    const filters = [
      eq(customerInvoice.organizationId, organizationId),
      eq(customerInvoice.customerId, contact.id),
    ];

    if (typeof search === "string" && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      filters.push(ilike(customerInvoice.invoiceNumber, searchPattern));
    }

    const rows = await db
      .select({
        id: customerInvoice.id,
        invoiceNumber: customerInvoice.invoiceNumber,
        invoiceDate: customerInvoice.invoiceDate,
        dueDate: customerInvoice.dueDate,
        totalAmount: customerInvoice.totalAmount,
        createdAt: customerInvoice.createdAt,
        amountPaidRaw: paymentSubquery.amountPaid,
      })
      .from(customerInvoice)
      .leftJoin(
        paymentSubquery,
        eq(customerInvoice.id, paymentSubquery.customerInvoiceId),
      )
      .where(and(...filters))
      .orderBy(desc(customerInvoice.createdAt));

    let invoices = rows.map((r) => {
      const totalAmount = Number(r.totalAmount);
      const amountPaid = Math.round(Number(r.amountPaidRaw || 0) * 100) / 100;
      const amountDue = Math.max(
        0,
        Math.round((totalAmount - amountPaid) * 100) / 100,
      );
      const computedStatus = computeInvoiceStatus(totalAmount, amountDue);

      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate,
        dueDate: r.dueDate,
        totalAmount,
        amountPaid,
        amountDue,
        status: computedStatus,
      };
    });

    if (typeof status === "string" && status.trim() && status !== "all") {
      const targetStatus = status.trim().toLowerCase();
      invoices = invoices.filter((inv) => inv.status.toLowerCase() === targetStatus);
    }

    return res.json(invoices);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/portal/invoices/:id
 * Retrieves full details for a single customer invoice belonging to the logged-in contact.
 * Returns 404 if not found or if the invoice belongs to another contact.
 */
export async function getPortalInvoice(req, res, next) {
  try {
    const { organizationId, contact } = req;
    const { id } = req.params;

    // Must match both organizationId and contact.id (customerId)
    const [invoiceRow] = await db
      .select({
        invoice: customerInvoice,
        so: salesOrder,
      })
      .from(customerInvoice)
      .leftJoin(salesOrder, eq(customerInvoice.salesOrderId, salesOrder.id))
      .where(
        and(
          eq(customerInvoice.organizationId, organizationId),
          eq(customerInvoice.customerId, contact.id),
          or(
            eq(customerInvoice.id, id),
            eq(customerInvoice.invoiceNumber, id),
          ),
        ),
      )
      .limit(1);

    if (!invoiceRow) {
      // 404 Not Found (do not return 403 to prevent revealing record existence)
      return res.status(404).json({ error: "Customer invoice not found" });
    }

    const { invoice, so } = invoiceRow;

    // Fetch lines from linked sales order
    let lines = [];
    if (invoice.salesOrderId) {
      const soLines = await db
        .select({
          line: salesOrderLine,
          product: product,
        })
        .from(salesOrderLine)
        .leftJoin(product, eq(salesOrderLine.productId, product.id))
        .where(eq(salesOrderLine.salesOrderId, invoice.salesOrderId));

      lines = soLines.map((row) => {
        const qty = Number(row.line.quantity);
        const price = Number(row.line.unitPrice);
        const tax = Number(row.line.taxAmount || 0);
        const subtotal = Math.round(qty * price * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;

        return {
          id: row.line.id,
          productId: row.line.productId,
          product: row.product?.name || null,
          productName: row.product?.name || null,
          quantity: qty,
          unitPrice: price,
          taxAmount: tax,
          subtotal,
          total,
        };
      });
    }

    // Fetch payments list made against this invoice
    const paymentRows = await db
      .select({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        direction: payment.direction,
        method: payment.method,
        amount: payment.amount,
        date: payment.date,
        createdAt: payment.createdAt,
      })
      .from(payment)
      .where(
        and(
          eq(payment.organizationId, organizationId),
          eq(payment.customerInvoiceId, invoice.id),
        ),
      )
      .orderBy(desc(payment.date));

    let amountPaid = 0;
    const payments = paymentRows.map((p) => {
      const amt = Number(p.amount);
      amountPaid += amt;
      return {
        id: p.id,
        paymentNumber: p.paymentNumber,
        direction: p.direction,
        method: p.method,
        amount: amt,
        date: p.date,
        createdAt: p.createdAt,
      };
    });

    amountPaid = Math.round(amountPaid * 100) / 100;
    const totalAmount = Number(invoice.totalAmount);
    const amountDue = Math.max(
      0,
      Math.round((totalAmount - amountPaid) * 100) / 100,
    );
    const computedStatus = computeInvoiceStatus(totalAmount, amountDue);

    return res.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      salesOrderId: invoice.salesOrderId,
      soNumber: so?.soNumber || null,
      soDate: so?.orderDate || null,
      customerId: invoice.customerId,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      totalAmount,
      amountPaid,
      amountDue,
      status: computedStatus,
      lines,
      payments,
      createdAt: invoice.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}
