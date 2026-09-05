import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import db from "../config/db.js";
import {
  analyticAccount,
  budget,
  contact,
  customerInvoice,
  purchaseOrderLine,
  salesOrderLine,
  vendorBill,
} from "../db/schema.js";

function budgetScope(organizationId, id) {
  return and(eq(budget.organizationId, organizationId), eq(budget.id, id));
}

/**
 * Fetches all invoices or bills contributing to achieved amount
 */
export async function fetchAchievedItems(
  orgId,
  analyticAccountId,
  analyticType,
  periodStart,
  periodEnd,
) {
  if (analyticType === "income") {
    const rows = await db
      .select({
        id: customerInvoice.id,
        number: customerInvoice.invoiceNumber,
        date: customerInvoice.invoiceDate,
        quantity: salesOrderLine.quantity,
        unitPrice: salesOrderLine.unitPrice,
        taxAmount: salesOrderLine.taxAmount,
      })
      .from(customerInvoice)
      .innerJoin(
        salesOrderLine,
        eq(customerInvoice.salesOrderId, salesOrderLine.salesOrderId),
      )
      .where(
        and(
          eq(customerInvoice.organizationId, orgId),
          eq(salesOrderLine.analyticAccountId, analyticAccountId),
          gte(customerInvoice.invoiceDate, periodStart),
          lte(customerInvoice.invoiceDate, periodEnd),
        ),
      );

    const grouped = new Map();
    for (const row of rows) {
      const lineTotal =
        Number(row.quantity) * Number(row.unitPrice) +
        Number(row.taxAmount || 0);
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          number: row.number,
          date: row.date,
          amount: 0,
        });
      }
      grouped.get(row.id).amount += lineTotal;
    }

    const items = Array.from(grouped.values()).map((item) => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
    }));

    return {
      documentType: "customer_invoice",
      items,
    };
  }

  if (analyticType === "expense") {
    const rows = await db
      .select({
        id: vendorBill.id,
        number: vendorBill.billNumber,
        date: vendorBill.invoiceDate,
        quantity: purchaseOrderLine.quantity,
        unitPrice: purchaseOrderLine.unitPrice,
      })
      .from(vendorBill)
      .innerJoin(
        purchaseOrderLine,
        eq(vendorBill.purchaseOrderId, purchaseOrderLine.purchaseOrderId),
      )
      .where(
        and(
          eq(vendorBill.organizationId, orgId),
          eq(purchaseOrderLine.analyticAccountId, analyticAccountId),
          gte(vendorBill.invoiceDate, periodStart),
          lte(vendorBill.invoiceDate, periodEnd),
        ),
      );

    const grouped = new Map();
    for (const row of rows) {
      const lineTotal = Number(row.quantity) * Number(row.unitPrice);
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          number: row.number,
          date: row.date,
          amount: 0,
        });
      }
      grouped.get(row.id).amount += lineTotal;
    }

    const items = Array.from(grouped.values()).map((item) => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
    }));

    return {
      documentType: "vendor_bill",
      items,
    };
  }

  return { documentType: null, items: [] };
}

/**
 * Computes achievedAmount, achievedPercent, amountToAchieve for confirmed/revised budgets
 */
export async function computeBudgetMetrics(budgetRow) {
  if (budgetRow.status !== "confirmed" && budgetRow.status !== "revised") {
    return {
      achievedAmount: null,
      achievedPercent: null,
      amountToAchieve: null,
    };
  }

  const { items } = await fetchAchievedItems(
    budgetRow.organizationId,
    budgetRow.analyticAccountId,
    budgetRow.analyticAccountType,
    budgetRow.periodStart,
    budgetRow.periodEnd,
  );

  const rawAchieved = items.reduce((acc, item) => acc + item.amount, 0);
  const achievedAmount = Math.round(rawAchieved * 100) / 100;
  const committed = Number(budgetRow.committedAmount) || 0;
  const achievedPercent =
    committed > 0
      ? Math.round(((achievedAmount / committed) * 100) * 100) / 100
      : 0;
  const amountToAchieve = Math.round((committed - achievedAmount) * 100) / 100;

  return {
    achievedAmount,
    achievedPercent,
    amountToAchieve,
  };
}

export async function listBudgets(req, res, next) {
  try {
    const rows = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        committedAmount: budget.committedAmount,
        status: budget.status,
        revisionOfId: budget.revisionOfId,
        responsibleContactId: budget.responsibleContactId,
        responsibleContactName: contact.name,
        analyticAccountId: budget.analyticAccountId,
        analyticAccountName: analyticAccount.name,
        analyticAccountType: analyticAccount.type,
        createdBy: budget.createdBy,
        createdAt: budget.createdAt,
      })
      .from(budget)
      .leftJoin(contact, eq(budget.responsibleContactId, contact.id))
      .leftJoin(analyticAccount, eq(budget.analyticAccountId, analyticAccount.id))
      .where(eq(budget.organizationId, req.organizationId))
      .orderBy(desc(budget.createdAt));

    const budgets = await Promise.all(
      rows.map(async (r) => {
        const metrics = await computeBudgetMetrics({
          ...r,
          organizationId: req.organizationId,
        });

        return {
          id: r.id,
          name: r.name,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          committedAmount: r.committedAmount,
          status: r.status,
          revisionOfId: r.revisionOfId,
          responsibleContactId: r.responsibleContactId,
          responsibleContactName: r.responsibleContactName || "Unknown",
          analyticAccountId: r.analyticAccountId,
          analyticAccountName: r.analyticAccountName || "Unknown",
          analyticAccountType: r.analyticAccountType || null,
          achievedAmount: metrics.achievedAmount,
          achievedPercent: metrics.achievedPercent,
          amountToAchieve: metrics.amountToAchieve,
          createdAt: r.createdAt,
        };
      }),
    );

    return res.json({ budgets });
  } catch (error) {
    return next(error);
  }
}

export async function getBudget(req, res, next) {
  try {
    const [row] = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        committedAmount: budget.committedAmount,
        status: budget.status,
        revisionOfId: budget.revisionOfId,
        responsibleContactId: budget.responsibleContactId,
        responsibleContactName: contact.name,
        analyticAccountId: budget.analyticAccountId,
        analyticAccountName: analyticAccount.name,
        analyticAccountType: analyticAccount.type,
        createdBy: budget.createdBy,
        createdAt: budget.createdAt,
      })
      .from(budget)
      .leftJoin(contact, eq(budget.responsibleContactId, contact.id))
      .leftJoin(analyticAccount, eq(budget.analyticAccountId, analyticAccount.id))
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const metrics = await computeBudgetMetrics({
      ...row,
      organizationId: req.organizationId,
    });

    // Fetch bidirectional revision links
    let revisionOf = null;
    if (row.revisionOfId) {
      const [parent] = await db
        .select({ id: budget.id, name: budget.name, status: budget.status })
        .from(budget)
        .where(budgetScope(req.organizationId, row.revisionOfId))
        .limit(1);
      if (parent) {
        revisionOf = parent;
      }
    }

    const revisions = await db
      .select({
        id: budget.id,
        name: budget.name,
        status: budget.status,
        committedAmount: budget.committedAmount,
      })
      .from(budget)
      .where(
        and(
          eq(budget.organizationId, req.organizationId),
          eq(budget.revisionOfId, row.id),
        ),
      )
      .orderBy(desc(budget.createdAt));

    return res.json({
      id: row.id,
      name: row.name,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      committedAmount: row.committedAmount,
      status: row.status,
      revisionOfId: row.revisionOfId,
      revisionOf,
      revisions,
      responsibleContactId: row.responsibleContactId,
      responsibleContactName: row.responsibleContactName || "Unknown",
      analyticAccountId: row.analyticAccountId,
      analyticAccountName: row.analyticAccountName || "Unknown",
      analyticAccountType: row.analyticAccountType || null,
      achievedAmount: metrics.achievedAmount,
      achievedPercent: metrics.achievedPercent,
      amountToAchieve: metrics.amountToAchieve,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createBudget(req, res, next) {
  try {
    const {
      name,
      periodStart,
      periodEnd,
      responsibleContactId,
      analyticAccountId,
      committedAmount,
    } = req.validatedBody;

    if (periodEnd < periodStart) {
      return res.status(400).json({
        error: "periodEnd must be greater than or equal to periodStart",
        field: "periodEnd",
      });
    }

    // 1. Validate responsibleContactId is a valid contact in this organization
    const [contactRow] = await db
      .select({ id: contact.id, name: contact.name, isArchived: contact.isArchived })
      .from(contact)
      .where(
        and(
          eq(contact.organizationId, req.organizationId),
          eq(contact.id, responsibleContactId),
        ),
      )
      .limit(1);

    if (!contactRow) {
      return res.status(400).json({
        error: "Responsible contact not found in this organization",
        field: "responsibleContactId",
      });
    }

    if (contactRow.isArchived) {
      return res.status(400).json({
        error: "Responsible contact is archived",
        field: "responsibleContactId",
      });
    }

    // 2. Validate analyticAccountId belongs to this org and is not archived
    const [analytic] = await db
      .select({
        id: analyticAccount.id,
        name: analyticAccount.name,
        type: analyticAccount.type,
        isArchived: analyticAccount.isArchived,
      })
      .from(analyticAccount)
      .where(
        and(
          eq(analyticAccount.organizationId, req.organizationId),
          eq(analyticAccount.id, analyticAccountId),
        ),
      )
      .limit(1);

    if (!analytic) {
      return res.status(400).json({
        error: "Analytic account not found in this organization",
        field: "analyticAccountId",
      });
    }

    if (analytic.isArchived) {
      return res.status(400).json({
        error: "Analytic account is archived and cannot be linked to a budget",
        field: "analyticAccountId",
      });
    }

    const id = `bgt_${randomUUID()}`;
    const [created] = await db
      .insert(budget)
      .values({
        id,
        organizationId: req.organizationId,
        name: name.trim(),
        periodStart,
        periodEnd,
        responsibleContactId,
        analyticAccountId,
        committedAmount: committedAmount.toFixed(2),
        status: "draft",
        revisionOfId: null,
        createdBy: req.session?.user?.id || "usr_system",
      })
      .returning();

    return res.status(201).json({
      id: created.id,
      name: created.name,
      periodStart: created.periodStart,
      periodEnd: created.periodEnd,
      committedAmount: created.committedAmount,
      status: created.status,
      revisionOfId: created.revisionOfId,
      revisionOf: null,
      revisions: [],
      responsibleContactId: created.responsibleContactId,
      responsibleContactName: contactRow.name,
      analyticAccountId: created.analyticAccountId,
      analyticAccountName: analytic.name,
      analyticAccountType: analytic.type,
      achievedAmount: null,
      achievedPercent: null,
      amountToAchieve: null,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateBudget(req, res, next) {
  try {
    const [current] = await db
      .select()
      .from(budget)
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!current) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (current.status !== "draft") {
      return res.status(400).json({
        error: "Budget can only be edited while in draft status",
      });
    }

    const newStart = req.validatedBody.periodStart ?? current.periodStart;
    const newEnd = req.validatedBody.periodEnd ?? current.periodEnd;

    if (newEnd < newStart) {
      return res.status(400).json({
        error: "periodEnd must be greater than or equal to periodStart",
        field: "periodEnd",
      });
    }

    let responsibleContactName = null;
    if (req.validatedBody.responsibleContactId !== undefined) {
      const [contactRow] = await db
        .select({ id: contact.id, name: contact.name, isArchived: contact.isArchived })
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, req.organizationId),
            eq(contact.id, req.validatedBody.responsibleContactId),
          ),
        )
        .limit(1);

      if (!contactRow) {
        return res.status(400).json({
          error: "Responsible contact not found in this organization",
          field: "responsibleContactId",
        });
      }
      if (contactRow.isArchived) {
        return res.status(400).json({
          error: "Responsible contact is archived",
          field: "responsibleContactId",
        });
      }
      responsibleContactName = contactRow.name;
    }

    let analyticAccountName = null;
    let analyticAccountType = null;
    if (req.validatedBody.analyticAccountId !== undefined) {
      const [analytic] = await db
        .select({
          id: analyticAccount.id,
          name: analyticAccount.name,
          type: analyticAccount.type,
          isArchived: analyticAccount.isArchived,
        })
        .from(analyticAccount)
        .where(
          and(
            eq(analyticAccount.organizationId, req.organizationId),
            eq(analyticAccount.id, req.validatedBody.analyticAccountId),
          ),
        )
        .limit(1);

      if (!analytic) {
        return res.status(400).json({
          error: "Analytic account not found in this organization",
          field: "analyticAccountId",
        });
      }

      if (analytic.isArchived) {
        return res.status(400).json({
          error: "Analytic account is archived and cannot be linked to a budget",
          field: "analyticAccountId",
        });
      }
      analyticAccountName = analytic.name;
      analyticAccountType = analytic.type;
    }

    const updateData = {};
    if (req.validatedBody.name !== undefined) {
      updateData.name = req.validatedBody.name.trim();
    }
    if (req.validatedBody.periodStart !== undefined) {
      updateData.periodStart = req.validatedBody.periodStart;
    }
    if (req.validatedBody.periodEnd !== undefined) {
      updateData.periodEnd = req.validatedBody.periodEnd;
    }
    if (req.validatedBody.responsibleContactId !== undefined) {
      updateData.responsibleContactId = req.validatedBody.responsibleContactId;
    }
    if (req.validatedBody.committedAmount !== undefined) {
      updateData.committedAmount = req.validatedBody.committedAmount.toFixed(2);
    }
    if (req.validatedBody.analyticAccountId !== undefined) {
      updateData.analyticAccountId = req.validatedBody.analyticAccountId;
    }

    await db
      .update(budget)
      .set(updateData)
      .where(budgetScope(req.organizationId, req.params.id));

    const [updatedRow] = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        committedAmount: budget.committedAmount,
        status: budget.status,
        revisionOfId: budget.revisionOfId,
        responsibleContactId: budget.responsibleContactId,
        responsibleContactName: contact.name,
        analyticAccountId: budget.analyticAccountId,
        analyticAccountName: analyticAccount.name,
        analyticAccountType: analyticAccount.type,
        createdBy: budget.createdBy,
        createdAt: budget.createdAt,
      })
      .from(budget)
      .leftJoin(contact, eq(budget.responsibleContactId, contact.id))
      .leftJoin(analyticAccount, eq(budget.analyticAccountId, analyticAccount.id))
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    return res.json({
      id: updatedRow.id,
      name: updatedRow.name,
      periodStart: updatedRow.periodStart,
      periodEnd: updatedRow.periodEnd,
      committedAmount: updatedRow.committedAmount,
      status: updatedRow.status,
      revisionOfId: updatedRow.revisionOfId,
      revisionOf: null,
      revisions: [],
      responsibleContactId: updatedRow.responsibleContactId,
      responsibleContactName:
        updatedRow.responsibleContactName || responsibleContactName || "Unknown",
      analyticAccountId: updatedRow.analyticAccountId,
      analyticAccountName:
        updatedRow.analyticAccountName || analyticAccountName || "Unknown",
      analyticAccountType:
        updatedRow.analyticAccountType || analyticAccountType || null,
      achievedAmount: null,
      achievedPercent: null,
      amountToAchieve: null,
      createdBy: updatedRow.createdBy,
      createdAt: updatedRow.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmBudget(req, res, next) {
  try {
    const [current] = await db
      .select()
      .from(budget)
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!current) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (current.status !== "draft") {
      return res.status(400).json({
        error: "Budget can only be confirmed from draft status",
      });
    }

    await db
      .update(budget)
      .set({ status: "confirmed" })
      .where(budgetScope(req.organizationId, req.params.id));

    req.params.id = current.id;
    return getBudget(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function cancelBudget(req, res, next) {
  try {
    const [current] = await db
      .select()
      .from(budget)
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!current) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (current.status === "revised") {
      return res.status(400).json({
        error:
          "A revised budget cannot be cancelled. Cancel the active revision instead.",
      });
    }

    await db
      .update(budget)
      .set({ status: "cancelled" })
      .where(budgetScope(req.organizationId, req.params.id));

    req.params.id = current.id;
    return getBudget(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function reviseBudget(req, res, next) {
  try {
    const { committedAmount } = req.validatedBody;

    const [original] = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        responsibleContactId: budget.responsibleContactId,
        analyticAccountId: budget.analyticAccountId,
        status: budget.status,
      })
      .from(budget)
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!original) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (original.status !== "confirmed") {
      return res.status(400).json({
        error: "Only confirmed budgets can be revised",
      });
    }

    // Determine revision name: append " Revised" once
    const baseName = original.name.replace(/\s+Revised$/i, "");
    const revisionName = `${baseName} Revised`;

    const newBudgetId = `bgt_${randomUUID()}`;

    // Execute in transaction
    await db.transaction(async (tx) => {
      // 1. Mark original as revised
      await tx
        .update(budget)
        .set({ status: "revised" })
        .where(eq(budget.id, original.id));

      // 2. Insert new revision budget
      await tx.insert(budget).values({
        id: newBudgetId,
        organizationId: req.organizationId,
        name: revisionName,
        periodStart: original.periodStart,
        periodEnd: original.periodEnd,
        responsibleContactId: original.responsibleContactId,
        analyticAccountId: original.analyticAccountId,
        committedAmount: committedAmount.toFixed(2),
        status: "confirmed",
        revisionOfId: original.id,
        createdBy: req.session?.user?.id || "usr_system",
      });
    });

    req.params.id = newBudgetId;
    return getBudget(req, res, next);
  } catch (error) {
    return next(error);
  }
}

/**
 * Part C: Achieved Amount drill-down
 * GET /api/budgets/:id/achieved-detail
 */
export async function getBudgetAchievedDetail(req, res, next) {
  try {
    const [row] = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        status: budget.status,
        committedAmount: budget.committedAmount,
        analyticAccountId: budget.analyticAccountId,
        analyticAccountName: analyticAccount.name,
        analyticAccountType: analyticAccount.type,
      })
      .from(budget)
      .leftJoin(analyticAccount, eq(budget.analyticAccountId, analyticAccount.id))
      .where(budgetScope(req.organizationId, req.params.id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (row.status !== "confirmed" && row.status !== "revised") {
      return res.json({
        budgetId: row.id,
        budgetName: row.name,
        status: row.status,
        analyticAccountId: row.analyticAccountId,
        analyticAccountName: row.analyticAccountName,
        analyticAccountType: row.analyticAccountType,
        documentType: null,
        totalAchievedAmount: 0,
        items: [],
      });
    }

    const { documentType, items } = await fetchAchievedItems(
      req.organizationId,
      row.analyticAccountId,
      row.analyticAccountType,
      row.periodStart,
      row.periodEnd,
    );

    const totalAchievedAmount = Math.round(
      items.reduce((acc, item) => acc + item.amount, 0) * 100,
    ) / 100;

    return res.json({
      budgetId: row.id,
      budgetName: row.name,
      status: row.status,
      analyticAccountId: row.analyticAccountId,
      analyticAccountName: row.analyticAccountName,
      analyticAccountType: row.analyticAccountType,
      documentType,
      totalAchievedAmount,
      items,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Part D: Reverse lookup of budgets by analytic account
 * GET /api/analytic-accounts/:id/budgets
 */
export async function listBudgetsForAnalyticAccount(req, res, next) {
  try {
    const [analytic] = await db
      .select({ id: analyticAccount.id, type: analyticAccount.type })
      .from(analyticAccount)
      .where(
        and(
          eq(analyticAccount.organizationId, req.organizationId),
          eq(analyticAccount.id, req.params.id),
        ),
      )
      .limit(1);

    if (!analytic) {
      return res.status(404).json({ error: "Analytic account not found" });
    }

    const rows = await db
      .select({
        id: budget.id,
        name: budget.name,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        committedAmount: budget.committedAmount,
        status: budget.status,
        createdAt: budget.createdAt,
      })
      .from(budget)
      .where(
        and(
          eq(budget.organizationId, req.organizationId),
          eq(budget.analyticAccountId, req.params.id),
        ),
      )
      .orderBy(desc(budget.createdAt));

    const budgets = await Promise.all(
      rows.map(async (b) => {
        let achievedAmount = null;
        if (b.status === "confirmed" || b.status === "revised") {
          const { items } = await fetchAchievedItems(
            req.organizationId,
            req.params.id,
            analytic.type,
            b.periodStart,
            b.periodEnd,
          );
          achievedAmount = Math.round(
            items.reduce((acc, it) => acc + it.amount, 0) * 100,
          ) / 100;
        }

        return {
          id: b.id,
          name: b.name,
          periodStart: b.periodStart,
          periodEnd: b.periodEnd,
          committedAmount: b.committedAmount,
          status: b.status,
          achievedAmount,
          createdAt: b.createdAt,
        };
      }),
    );

    return res.json({ budgets });
  } catch (error) {
    return next(error);
  }
}
