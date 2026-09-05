import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  contact,
  customerInvoice,
  journal,
  journalEntry,
  payment,
  user,
  vendorBill,
} from "../db/schema.js";
import {
  getAccountIdByName,
  postJournalEntry,
} from "../services/accounting/postJournalEntry.js";

/**
 * Computes display status based on total and due amount
 * @param {number} totalAmount
 * @param {number} amountDue
 * @returns {'Paid' | 'Partial' | 'Not Paid'}
 */
export function computePaymentStatus(totalAmount, amountDue) {
  if (amountDue <= 0) {
    return "Paid";
  }
  if (amountDue > 0 && amountDue < totalAmount) {
    return "Partial";
  }
  return "Not Paid";
}

/**
 * POST /api/payments
 * Reusable endpoint for recording payments against Vendor Bills or Customer Invoices.
 */
export async function recordPayment(req, res, next) {
  try {
    const { organizationId } = req;
    const recordedBy = req.session?.user?.id;

    if (!recordedBy) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { targetType, targetId, method, amount, date, note } =
      req.validatedBody;

    const result = await db.transaction(async (tx) => {
      // 1. Load the target scoped to current organizationId
      let target = null;
      let contactId = null;

      if (targetType === "vendor_bill") {
        const [bill] = await tx
          .select()
          .from(vendorBill)
          .where(
            and(
              eq(vendorBill.id, targetId),
              eq(vendorBill.organizationId, organizationId),
            ),
          )
          .limit(1);

        if (!bill) {
          return {
            statusCode: 404,
            error: "Vendor bill not found",
          };
        }
        target = bill;
        contactId = bill.vendorId;
      } else if (targetType === "customer_invoice") {
        const [invoice] = await tx
          .select()
          .from(customerInvoice)
          .where(
            and(
              eq(customerInvoice.id, targetId),
              eq(customerInvoice.organizationId, organizationId),
            ),
          )
          .limit(1);

        if (!invoice) {
          return {
            statusCode: 404,
            error: "Customer invoice not found",
          };
        }
        target = invoice;
        contactId = invoice.customerId;
      }

      // If requester has role "contact", validate the target belongs to their own resolved contact id
      if (req.session?.user?.role === "contact") {
        const [userContact] = await tx
          .select({ id: contact.id })
          .from(contact)
          .where(
            and(
              eq(contact.userId, recordedBy),
              eq(contact.organizationId, organizationId),
            ),
          )
          .limit(1);

        if (!userContact || userContact.id !== contactId) {
          return {
            statusCode: 403,
            error: "You are not authorized to make a payment for this record",
          };
        }
      }

      // 2. Compute current amountDue
      const paymentCondition =
        targetType === "vendor_bill"
          ? eq(payment.vendorBillId, targetId)
          : eq(payment.customerInvoiceId, targetId);

      const [existingPayments] = await tx
        .select({
          totalPaid:
            sql`coalesce(sum(${payment.amount}), 0)::numeric`.as("total_paid"),
        })
        .from(payment)
        .where(
          and(eq(payment.organizationId, organizationId), paymentCondition),
        );

      const totalAmount = Number(target.totalAmount);
      const alreadyPaid =
        Math.round(Number(existingPayments?.totalPaid || 0) * 100) / 100;
      const currentAmountDue = Math.max(
        0,
        Math.round((totalAmount - alreadyPaid) * 100) / 100,
      );

      const paymentAmount = Math.round(Number(amount) * 100) / 100;

      if (paymentAmount > currentAmountDue) {
        return {
          statusCode: 400,
          error: `Payment amount (${paymentAmount}) exceeds amount due (${currentAmountDue})`,
        };
      }

      // 3. Determine direction and account pairing
      let direction = "outbound";
      let lines = [];

      const methodAccountName = method === "cash" ? "Cash" : "Bank";
      const methodAccountId = await getAccountIdByName(
        organizationId,
        methodAccountName,
        tx,
      );

      if (targetType === "vendor_bill") {
        direction = "outbound";
        const creditorsId = await getAccountIdByName(
          organizationId,
          "Creditors",
          tx,
        );

        // Debit: Creditors, Credit: Cash/Bank
        lines = [
          {
            accountId: creditorsId,
            contactId,
            debit: paymentAmount,
            credit: 0,
          },
          {
            accountId: methodAccountId,
            contactId,
            debit: 0,
            credit: paymentAmount,
          },
        ];
      } else {
        direction = "inbound";
        const debtorsId = await getAccountIdByName(
          organizationId,
          "Debtors",
          tx,
        );

        // Debit: Cash/Bank, Credit: Debtors
        lines = [
          {
            accountId: methodAccountId,
            contactId,
            debit: paymentAmount,
            credit: 0,
          },
          {
            accountId: debtorsId,
            contactId,
            debit: 0,
            credit: paymentAmount,
          },
        ];
      }

      // 4. Look up Cash or Bank Journal
      const [paymentJournal] = await tx
        .select()
        .from(journal)
        .where(
          and(
            eq(journal.organizationId, organizationId),
            eq(journal.type, method),
          ),
        )
        .limit(1);

      if (!paymentJournal) {
        return {
          statusCode: 400,
          error: `${methodAccountName} journal not found for this organization`,
        };
      }

      // 5. Generate paymentNumber: "PAY/{year}/{seq}"
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(payment)
        .where(eq(payment.organizationId, organizationId));

      const seq = Number(count) + 1;
      const year = date.split("-")[0];
      const paymentNumber = `PAY/${year}/${String(seq).padStart(4, "0")}`;

      // Pre-generate payment id for two-phase link
      const paymentId = `p_${randomUUID()}`;

      // 6. Post double-entry journal entry atomically
      const { journalEntryId } = await postJournalEntry(
        {
          organizationId,
          journalId: paymentJournal.id,
          date,
          reference: paymentNumber,
          sourceType: "payment",
          sourceId: paymentId,
          lines,
        },
        tx,
      );

      // 7. Insert payment row
      const [createdPayment] = await tx
        .insert(payment)
        .values({
          id: paymentId,
          organizationId,
          paymentNumber,
          direction,
          method,
          amount: String(paymentAmount),
          date,
          vendorBillId: targetType === "vendor_bill" ? targetId : null,
          customerInvoiceId: targetType === "customer_invoice" ? targetId : null,
          journalEntryId,
          recordedBy,
        })
        .returning();

      // 8. Compute updated status
      const newAmountPaid =
        Math.round((alreadyPaid + paymentAmount) * 100) / 100;
      const newAmountDue = Math.max(
        0,
        Math.round((totalAmount - newAmountPaid) * 100) / 100,
      );
      const computedStatus = computePaymentStatus(totalAmount, newAmountDue);

      return {
        statusCode: 201,
        data: {
          id: createdPayment.id,
          paymentNumber: createdPayment.paymentNumber,
          organizationId: createdPayment.organizationId,
          direction: createdPayment.direction,
          method: createdPayment.method,
          amount: Number(createdPayment.amount),
          date: createdPayment.date,
          note: note ? note.trim() : null,
          vendorBillId: createdPayment.vendorBillId,
          customerInvoiceId: createdPayment.customerInvoiceId,
          journalEntryId: createdPayment.journalEntryId,
          recordedBy: createdPayment.recordedBy,
          createdAt: createdPayment.createdAt,
          target: {
            targetType,
            targetId,
            totalAmount,
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: computedStatus,
          },
        },
      };
    });

    if (result.error) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    return res.status(201).json(result.data);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payments?targetType=vendor_bill&targetId=X
 * Lists all payments recorded for a given target.
 */
export async function listPayments(req, res, next) {
  try {
    const { organizationId } = req;
    const { targetType, targetId } = req.query;

    if (
      !targetType ||
      !targetId ||
      !["vendor_bill", "customer_invoice"].includes(targetType)
    ) {
      return res.status(400).json({
        error:
          "targetType ('vendor_bill' or 'customer_invoice') and targetId query params are required",
      });
    }

    const targetCondition =
      targetType === "vendor_bill"
        ? eq(payment.vendorBillId, targetId)
        : eq(payment.customerInvoiceId, targetId);

    const rows = await db
      .select({
        payment,
        recordedByName: user.name,
      })
      .from(payment)
      .leftJoin(user, eq(payment.recordedBy, user.id))
      .where(and(eq(payment.organizationId, organizationId), targetCondition))
      .orderBy(desc(payment.date), desc(payment.createdAt));

    const payments = rows.map((r) => ({
      id: r.payment.id,
      paymentNumber: r.payment.paymentNumber,
      method: r.payment.method,
      direction: r.payment.direction,
      amount: Number(r.payment.amount),
      date: r.payment.date,
      note: null,
      recordedByName: r.recordedByName || null,
      createdAt: r.payment.createdAt,
    }));

    return res.json({ payments });
  } catch (error) {
    return next(error);
  }
}
