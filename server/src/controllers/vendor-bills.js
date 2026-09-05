import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  contact,
  journal,
  payment,
  product,
  purchaseOrder,
  purchaseOrderLine,
  vendorBill,
} from "../db/schema.js";
import {
  getAccountIdByName,
  postJournalEntry,
} from "../services/accounting/postJournalEntry.js";

/**
 * Computes the display status based on totalAmount and amountDue
 * @param {number} totalAmount
 * @param {number} amountDue
 * @returns {'Paid' | 'Partial' | 'Not Paid'}
 */
export function computeBillStatus(totalAmount, amountDue) {
  if (amountDue <= 0) {
    return "Paid";
  }
  if (amountDue > 0 && amountDue < totalAmount) {
    return "Partial";
  }
  return "Not Paid";
}

/**
 * POST /api/vendor-bills
 * Creates a vendor bill from a confirmed purchase order atomically with double-entry journal posting.
 */
export async function createVendorBill(req, res, next) {
  try {
    const { organizationId } = req;
    const { purchaseOrderId, vendorReference, invoiceDate, dueDate } =
      req.validatedBody;

    const result = await db.transaction(async (tx) => {
      // 1. Check purchase order exists and belongs to current org
      const [po] = await tx
        .select()
        .from(purchaseOrder)
        .where(
          and(
            eq(purchaseOrder.id, purchaseOrderId),
            eq(purchaseOrder.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!po) {
        return {
          statusCode: 404,
          error: "Purchase order not found",
        };
      }

      // Must have status 'confirmed'
      if (po.status !== "confirmed") {
        return {
          statusCode: 400,
          error: "Purchase order must be confirmed before creating a bill",
        };
      }

      // Check if a bill already exists for this PO
      const [existingBill] = await tx
        .select({ id: vendorBill.id })
        .from(vendorBill)
        .where(
          and(
            eq(vendorBill.purchaseOrderId, purchaseOrderId),
            eq(vendorBill.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (existingBill) {
        return {
          statusCode: 409,
          error: "A bill already exists for this purchase order",
        };
      }

      // 2. Fetch the PO's lines and product details
      const poLines = await tx
        .select({
          line: purchaseOrderLine,
          product: product,
        })
        .from(purchaseOrderLine)
        .leftJoin(product, eq(purchaseOrderLine.productId, product.id))
        .where(eq(purchaseOrderLine.purchaseOrderId, purchaseOrderId));

      if (poLines.length === 0) {
        return {
          statusCode: 400,
          error: "Purchase order has no line items",
        };
      }

      // 3. Compute totalAmount across lines
      let computedTotal = 0;
      const formattedLines = poLines.map((row) => {
        const qty = Number(row.line.quantity);
        const price = Number(row.line.unitPrice);
        const subtotal = Math.round(qty * price * 100) / 100;
        computedTotal += subtotal;

        return {
          id: row.line.id,
          productId: row.line.productId,
          productName: row.product?.name || null,
          productType: row.product?.type || null,
          productCategory: row.product?.category || null,
          quantity: qty,
          unitPrice: price,
          subtotal,
        };
      });

      const totalAmount = Math.round(computedTotal * 100) / 100;
      if (totalAmount <= 0) {
        return {
          statusCode: 400,
          error: "Purchase order total must be greater than zero",
        };
      }

      // 4. Generate billNumber: "Bill/{year}/{seq}"
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(vendorBill)
        .where(eq(vendorBill.organizationId, organizationId));

      const seq = Number(count) + 1;
      const year = invoiceDate.split("-")[0];
      const billNumber = `Bill/${year}/${String(seq).padStart(4, "0")}`;

      // 5. Resolve account IDs via getAccountIdByName
      const purchaseExpenseId = await getAccountIdByName(
        organizationId,
        "Purchase Expense",
        tx,
      );
      const creditorsId = await getAccountIdByName(
        organizationId,
        "Creditors",
        tx,
      );

      // 6. Look up Purchase Journal for this org
      const [purchaseJournal] = await tx
        .select()
        .from(journal)
        .where(
          and(
            eq(journal.organizationId, organizationId),
            eq(journal.type, "purchase"),
          ),
        )
        .limit(1);

      if (!purchaseJournal) {
        return {
          statusCode: 400,
          error: "Purchase journal not found for this organization",
        };
      }

      // 7. Pre-generate vendorBillId for two-phase link
      const vendorBillId = `vb_${randomUUID()}`;

      // 8. Call postJournalEntry with pre-generated id as sourceId
      const { journalEntryId } = await postJournalEntry(
        {
          organizationId,
          journalId: purchaseJournal.id,
          date: invoiceDate,
          reference: billNumber,
          sourceType: "vendor_bill",
          sourceId: vendorBillId,
          lines: [
            {
              accountId: purchaseExpenseId,
              contactId: po.vendorId,
              debit: totalAmount,
              credit: 0,
            },
            {
              accountId: creditorsId,
              contactId: po.vendorId,
              debit: 0,
              credit: totalAmount,
            },
          ],
        },
        tx,
      );

      // 9. Insert vendorBill row
      const [createdBill] = await tx
        .insert(vendorBill)
        .values({
          id: vendorBillId,
          organizationId,
          purchaseOrderId: po.id,
          vendorId: po.vendorId,
          billNumber,
          vendorReference: vendorReference ? vendorReference.trim() : null,
          invoiceDate,
          dueDate: dueDate || null,
          totalAmount: String(totalAmount),
          status: "confirmed",
          journalEntryId,
        })
        .returning();

      // Fetch vendor details
      const [vendorRow] = await tx
        .select()
        .from(contact)
        .where(eq(contact.id, po.vendorId))
        .limit(1);

      return {
        statusCode: 201,
        bill: {
          id: createdBill.id,
          billNumber: createdBill.billNumber,
          vendorReference: createdBill.vendorReference,
          purchaseOrderId: createdBill.purchaseOrderId,
          vendorId: createdBill.vendorId,
          vendorName: vendorRow?.name || null,
          vendor: vendorRow || null,
          invoiceDate: createdBill.invoiceDate,
          dueDate: createdBill.dueDate,
          totalAmount,
          amountPaid: 0,
          amountDue: totalAmount,
          status: "Not Paid",
          journalEntryId: createdBill.journalEntryId,
          lines: formattedLines,
          createdAt: createdBill.createdAt,
        },
      };
    });

    if (result.error) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    return res.status(201).json(result.bill);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/vendor-bills
 * Lists all bills for the current organization with payment sums and computed statuses.
 */
export async function listVendorBills(req, res, next) {
  try {
    const { organizationId } = req;
    const { search, status } = req.query;

    // Subquery to aggregate amount paid per bill
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

    const filters = [eq(vendorBill.organizationId, organizationId)];

    if (typeof search === "string" && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      filters.push(
        or(
          ilike(vendorBill.billNumber, searchPattern),
          ilike(vendorBill.vendorReference, searchPattern),
          ilike(contact.name, searchPattern),
        ),
      );
    }

    const rows = await db
      .select({
        id: vendorBill.id,
        billNumber: vendorBill.billNumber,
        vendorReference: vendorBill.vendorReference,
        purchaseOrderId: vendorBill.purchaseOrderId,
        vendorId: vendorBill.vendorId,
        vendorName: contact.name,
        invoiceDate: vendorBill.invoiceDate,
        dueDate: vendorBill.dueDate,
        totalAmount: vendorBill.totalAmount,
        journalEntryId: vendorBill.journalEntryId,
        createdAt: vendorBill.createdAt,
        amountPaidRaw: paymentSubquery.amountPaid,
      })
      .from(vendorBill)
      .leftJoin(contact, eq(vendorBill.vendorId, contact.id))
      .leftJoin(paymentSubquery, eq(vendorBill.id, paymentSubquery.vendorBillId))
      .where(and(...filters))
      .orderBy(desc(vendorBill.createdAt));

    let vendorBills = rows.map((r) => {
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
        purchaseOrderId: r.purchaseOrderId,
        vendorId: r.vendorId,
        vendorName: r.vendorName || null,
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
      vendorBills = vendorBills.filter(
        (b) => b.status.toLowerCase() === targetStatus,
      );
    }

    return res.json({ vendorBills });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/vendor-bills/:id
 * Retrieves full bill details including joined vendor, PO lines, linked payments, and computed status.
 */
export async function getVendorBill(req, res, next) {
  try {
    const { organizationId } = req;
    const { id } = req.params;

    // Look up by id or billNumber
    const [billRow] = await db
      .select({
        bill: vendorBill,
        vendor: contact,
        po: purchaseOrder,
      })
      .from(vendorBill)
      .leftJoin(contact, eq(vendorBill.vendorId, contact.id))
      .leftJoin(purchaseOrder, eq(vendorBill.purchaseOrderId, purchaseOrder.id))
      .where(
        and(
          eq(vendorBill.organizationId, organizationId),
          or(eq(vendorBill.id, id), eq(vendorBill.billNumber, id)),
        ),
      )
      .limit(1);

    if (!billRow) {
      return res.status(404).json({ error: "Vendor bill not found" });
    }

    const { bill, vendor: vendorData, po } = billRow;

    // Fetch lines from the linked purchase order
    const poLines = await db
      .select({
        line: purchaseOrderLine,
        product: product,
      })
      .from(purchaseOrderLine)
      .leftJoin(product, eq(purchaseOrderLine.productId, product.id))
      .where(eq(purchaseOrderLine.purchaseOrderId, bill.purchaseOrderId));

    const lines = poLines.map((row) => {
      const qty = Number(row.line.quantity);
      const price = Number(row.line.unitPrice);
      const subtotal = Math.round(qty * price * 100) / 100;
      return {
        id: row.line.id,
        productId: row.line.productId,
        productName: row.product?.name || null,
        productType: row.product?.type || null,
        productCategory: row.product?.category || null,
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    // Fetch payments made against this bill
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
      vendorName: vendorData?.name || null,
      vendor: vendorData || null,
      invoiceDate: bill.invoiceDate,
      dueDate: bill.dueDate,
      totalAmount,
      amountPaid,
      amountDue,
      status: computedStatus,
      rawStatus: bill.status,
      journalEntryId: bill.journalEntryId,
      sourceDocumentUrl: bill.sourceDocumentUrl,
      lines,
      payments,
      createdAt: bill.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}
