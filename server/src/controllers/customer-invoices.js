import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  contact,
  customerInvoice,
  journal,
  payment,
  product,
  salesOrder,
  salesOrderLine,
} from "../db/schema.js";
import {
  getAccountIdByName,
  postJournalEntry,
} from "../services/accounting/postJournalEntry.js";

/**
 * Computes display status based on totalAmount and amountDue
 * @param {number} totalAmount
 * @param {number} amountDue
 * @returns {'Paid' | 'Partial' | 'Not Paid'}
 */
export function computeInvoiceStatus(totalAmount, amountDue) {
  if (amountDue <= 0) {
    return "Paid";
  }
  if (amountDue > 0 && amountDue < totalAmount) {
    return "Partial";
  }
  return "Not Paid";
}

/**
 * POST /api/customer-invoices
 * Creates a customer invoice from a confirmed sales order atomically with double-entry journal posting.
 */
export async function createCustomerInvoice(req, res, next) {
  try {
    const { organizationId } = req;
    const { salesOrderId, invoiceDate, dueDate } = req.validatedBody;

    const result = await db.transaction(async (tx) => {
      // 1. Check sales order exists and belongs to current org
      const [so] = await tx
        .select()
        .from(salesOrder)
        .where(
          and(
            eq(salesOrder.id, salesOrderId),
            eq(salesOrder.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!so) {
        return {
          statusCode: 404,
          error: "Sales order not found",
        };
      }

      // Must have status 'confirmed'
      if (so.status !== "confirmed") {
        return {
          statusCode: 400,
          error: "Sales order must be confirmed before creating an invoice",
        };
      }

      // Check if an invoice already exists for this SO (one-invoice-per-SO)
      const [existingInvoice] = await tx
        .select({ id: customerInvoice.id })
        .from(customerInvoice)
        .where(
          and(
            eq(customerInvoice.salesOrderId, salesOrderId),
            eq(customerInvoice.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (existingInvoice) {
        return {
          statusCode: 409,
          error: "An invoice already exists for this sales order",
        };
      }

      // 2. Fetch the SO's lines and product details
      const soLines = await tx
        .select({
          line: salesOrderLine,
          product: product,
        })
        .from(salesOrderLine)
        .leftJoin(product, eq(salesOrderLine.productId, product.id))
        .where(eq(salesOrderLine.salesOrderId, salesOrderId));

      if (soLines.length === 0) {
        return {
          statusCode: 400,
          error: "Sales order has no line items",
        };
      }

      // 3. Compute totalAmount across lines (subtotal + tax)
      let computedSubtotal = 0;
      let computedTax = 0;

      const formattedLines = soLines.map((row) => {
        const qty = Number(row.line.quantity);
        const price = Number(row.line.unitPrice);
        const tax = Number(row.line.taxAmount || 0);
        const subtotal = Math.round(qty * price * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;

        computedSubtotal += subtotal;
        computedTax += tax;

        return {
          id: row.line.id,
          productId: row.line.productId,
          productName: row.product?.name || null,
          productType: row.product?.type || null,
          productCategory: row.product?.category || null,
          quantity: qty,
          unitPrice: price,
          taxAmount: tax,
          subtotal,
          total,
        };
      });

      const subtotal = Math.round(computedSubtotal * 100) / 100;
      const totalTax = Math.round(computedTax * 100) / 100;
      const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;

      if (totalAmount <= 0) {
        return {
          statusCode: 400,
          error: "Sales order total must be greater than zero",
        };
      }

      // 4. Generate invoiceNumber: "Inv/{year}/{seq}"
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(customerInvoice)
        .where(eq(customerInvoice.organizationId, organizationId));

      const seq = Number(count) + 1;
      const year = invoiceDate.split("-")[0];
      const invoiceNumber = `Inv/${year}/${String(seq).padStart(4, "0")}`;

      // 5. Resolve account IDs via getAccountIdByName: "Debtors" and "Sales Income"
      const debtorsId = await getAccountIdByName(
        organizationId,
        "Debtors",
        tx,
      );
      const salesIncomeId = await getAccountIdByName(
        organizationId,
        "Sales Income",
        tx,
      );

      // 6. Look up Sales Journal for this org
      const [salesJournal] = await tx
        .select()
        .from(journal)
        .where(
          and(
            eq(journal.organizationId, organizationId),
            eq(journal.type, "sales"),
          ),
        )
        .limit(1);

      if (!salesJournal) {
        return {
          statusCode: 400,
          error: "Sales journal not found for this organization",
        };
      }

      // 7. Pre-generate customerInvoiceId for two-phase link
      const customerInvoiceId = `ci_${randomUUID()}`;

      // 8. Call postJournalEntry with pre-generated id as sourceId
      // Tax amount is folded into Sales Income credit line per specification
      const { journalEntryId } = await postJournalEntry(
        {
          organizationId,
          journalId: salesJournal.id,
          date: invoiceDate,
          reference: invoiceNumber,
          sourceType: "customer_invoice",
          sourceId: customerInvoiceId,
          lines: [
            {
              accountId: debtorsId,
              contactId: so.customerId,
              debit: totalAmount,
              credit: 0,
            },
            {
              accountId: salesIncomeId,
              contactId: so.customerId,
              debit: 0,
              credit: totalAmount,
            },
          ],
        },
        tx,
      );

      // 9. Insert customerInvoice row
      const [createdInvoice] = await tx
        .insert(customerInvoice)
        .values({
          id: customerInvoiceId,
          organizationId,
          salesOrderId: so.id,
          customerId: so.customerId,
          invoiceNumber,
          invoiceDate,
          dueDate: dueDate || null,
          totalAmount: String(totalAmount),
          status: "confirmed",
          journalEntryId,
        })
        .returning();

      // Fetch customer details
      const [customerRow] = await tx
        .select()
        .from(contact)
        .where(eq(contact.id, so.customerId))
        .limit(1);

      return {
        statusCode: 201,
        invoice: {
          id: createdInvoice.id,
          invoiceNumber: createdInvoice.invoiceNumber,
          salesOrderId: createdInvoice.salesOrderId,
          soNumber: so.soNumber || null,
          customerId: createdInvoice.customerId,
          customerName: customerRow?.name || null,
          customer: customerRow || null,
          invoiceDate: createdInvoice.invoiceDate,
          dueDate: createdInvoice.dueDate,
          totalAmount,
          subtotal,
          totalTax,
          amountPaid: 0,
          amountDue: totalAmount,
          status: "Not Paid",
          journalEntryId: createdInvoice.journalEntryId,
          lines: formattedLines,
          createdAt: createdInvoice.createdAt,
        },
      };
    });

    if (result.error) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    return res.status(201).json(result.invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/customer-invoices
 * Lists all invoices for the current organization with payment sums and computed statuses.
 */
export async function listCustomerInvoices(req, res, next) {
  try {
    const { organizationId } = req;
    const { search, status } = req.query;

    // Subquery to aggregate amount paid per customer invoice
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

    const filters = [eq(customerInvoice.organizationId, organizationId)];

    if (typeof search === "string" && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      filters.push(
        or(
          ilike(customerInvoice.invoiceNumber, searchPattern),
          ilike(contact.name, searchPattern),
        ),
      );
    }

    const rows = await db
      .select({
        id: customerInvoice.id,
        invoiceNumber: customerInvoice.invoiceNumber,
        salesOrderId: customerInvoice.salesOrderId,
        customerId: customerInvoice.customerId,
        customerName: contact.name,
        invoiceDate: customerInvoice.invoiceDate,
        dueDate: customerInvoice.dueDate,
        totalAmount: customerInvoice.totalAmount,
        journalEntryId: customerInvoice.journalEntryId,
        createdAt: customerInvoice.createdAt,
        amountPaidRaw: paymentSubquery.amountPaid,
      })
      .from(customerInvoice)
      .leftJoin(contact, eq(customerInvoice.customerId, contact.id))
      .leftJoin(
        paymentSubquery,
        eq(customerInvoice.id, paymentSubquery.customerInvoiceId),
      )
      .where(and(...filters))
      .orderBy(desc(customerInvoice.createdAt));

    let customerInvoices = rows.map((r) => {
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
        salesOrderId: r.salesOrderId,
        customerId: r.customerId,
        customerName: r.customerName || null,
        invoiceDate: r.invoiceDate,
        dueDate: r.dueDate,
        totalAmount,
        amountPaid,
        amountDue,
        status: computedStatus,
        journalEntryId: r.journalEntryId,
        createdAt: r.createdAt,
      };
    });

    // Optional status filter
    if (typeof status === "string" && status.trim() && status !== "all") {
      const targetStatus = status.trim().toLowerCase();
      customerInvoices = customerInvoices.filter(
        (inv) => inv.status.toLowerCase() === targetStatus,
      );
    }

    return res.json({ customerInvoices });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/customer-invoices/:id
 * Retrieves full invoice details including joined customer, SO lines, linked payments, and computed status.
 */
export async function getCustomerInvoice(req, res, next) {
  try {
    const { organizationId } = req;
    const { id } = req.params;

    // Look up by id or invoiceNumber
    const [invoiceRow] = await db
      .select({
        invoice: customerInvoice,
        customer: contact,
        so: salesOrder,
      })
      .from(customerInvoice)
      .leftJoin(contact, eq(customerInvoice.customerId, contact.id))
      .leftJoin(salesOrder, eq(customerInvoice.salesOrderId, salesOrder.id))
      .where(
        and(
          eq(customerInvoice.organizationId, organizationId),
          or(
            eq(customerInvoice.id, id),
            eq(customerInvoice.invoiceNumber, id),
          ),
        ),
      )
      .limit(1);

    if (!invoiceRow) {
      return res.status(404).json({ error: "Customer invoice not found" });
    }

    const { invoice, customer: customerData, so } = invoiceRow;

    // Fetch lines from the linked sales order
    const soLines = await db
      .select({
        line: salesOrderLine,
        product: product,
      })
      .from(salesOrderLine)
      .leftJoin(product, eq(salesOrderLine.productId, product.id))
      .where(eq(salesOrderLine.salesOrderId, invoice.salesOrderId));

    let computedSubtotal = 0;
    let computedTax = 0;

    const lines = soLines.map((row) => {
      const qty = Number(row.line.quantity);
      const price = Number(row.line.unitPrice);
      const tax = Number(row.line.taxAmount || 0);
      const subtotal = Math.round(qty * price * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      computedSubtotal += subtotal;
      computedTax += tax;

      return {
        id: row.line.id,
        productId: row.line.productId,
        productName: row.product?.name || null,
        productType: row.product?.type || null,
        productCategory: row.product?.category || null,
        quantity: qty,
        unitPrice: price,
        taxAmount: tax,
        subtotal,
        total,
      };
    });

    const subtotal = Math.round(computedSubtotal * 100) / 100;
    const totalTax = Math.round(computedTax * 100) / 100;

    // Fetch payments made against this invoice
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
      customerName: customerData?.name || null,
      customer: customerData || null,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      totalAmount,
      subtotal,
      totalTax,
      amountPaid,
      amountDue,
      status: computedStatus,
      rawStatus: invoice.status,
      journalEntryId: invoice.journalEntryId,
      lines,
      payments,
      createdAt: invoice.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}
