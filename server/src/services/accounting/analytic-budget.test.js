import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import db from "../../config/db.js";
import {
  analyticAccount,
  budget,
  chartOfAccounts,
  journal,
  journalEntry,
  journalEntryLine,
  member,
  organization,
  user,
} from "../../db/schema.js";
import { postJournalEntry } from "./postJournalEntry.js";
import { getBudgetReport } from "../../controllers/reports.js";

describe("Analytic Accounts, Budgets & postJournalEntry Extensions", () => {
  const orgId = "org_urban_furniture";
  const journalId = "journal_cash";
  const cashAccountId = "coa_cash";
  const expenseAccountId = "coa_purchase_expense";
  const incomeAccountId = "coa_sales_income";

  let testUserId = null;
  let activeAnalyticExpenseId = null;
  let activeAnalyticIncomeId = null;
  let archivedAnalyticId = null;
  let testBudgetId = null;
  const createdJeIds = [];

  before(async () => {
    // 1. Ensure test user is member of org
    const [existingMember] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, orgId))
      .limit(1);

    if (existingMember) {
      testUserId = existingMember.userId;
    } else {
      testUserId = `usr_test_${Date.now()}`;
      await db.insert(user).values({
        id: testUserId,
        name: "Budget Tester",
        email: `tester_${Date.now()}@test.com`,
      });
      await db.insert(member).values({
        id: `mem_test_${Date.now()}`,
        organizationId: orgId,
        userId: testUserId,
        role: "admin",
        createdAt: new Date(),
      });
    }

    // 2. Create test analytic accounts
    activeAnalyticExpenseId = `ana_exp_${Date.now()}`;
    await db.insert(analyticAccount).values({
      id: activeAnalyticExpenseId,
      organizationId: orgId,
      name: `R&D Projects ${Date.now()}`,
      type: "expense",
      isArchived: false,
    });

    activeAnalyticIncomeId = `ana_inc_${Date.now()}`;
    await db.insert(analyticAccount).values({
      id: activeAnalyticIncomeId,
      organizationId: orgId,
      name: `Consulting Stream ${Date.now()}`,
      type: "income",
      isArchived: false,
    });

    archivedAnalyticId = `ana_arc_${Date.now()}`;
    await db.insert(analyticAccount).values({
      id: archivedAnalyticId,
      organizationId: orgId,
      name: `Old Initiative ${Date.now()}`,
      type: "expense",
      isArchived: true,
    });
  });

  after(async () => {
    // Clean up created budgets
    if (testBudgetId) {
      await db.delete(budget).where(eq(budget.id, testBudgetId));
    }

    // Clean up journal entries
    if (createdJeIds.length > 0) {
      await db.delete(journalEntry).where(inArray(journalEntry.id, createdJeIds));
    }

    // Clean up analytic accounts
    const anaIds = [
      activeAnalyticExpenseId,
      activeAnalyticIncomeId,
      archivedAnalyticId,
    ].filter(Boolean);
    if (anaIds.length > 0) {
      await db
        .delete(analyticAccount)
        .where(inArray(analyticAccount.id, anaIds));
    }
  });

  describe("Part A: postJournalEntry with analyticAccountId", () => {
    it("successfully posts journal entry lines with valid analyticAccountId", async () => {
      const res = await postJournalEntry({
        organizationId: orgId,
        journalId,
        date: "2026-06-15",
        sourceType: "manual",
        sourceId: null,
        lines: [
          {
            accountId: expenseAccountId,
            analyticAccountId: activeAnalyticExpenseId,
            debit: 500,
            credit: 0,
          },
          {
            accountId: cashAccountId,
            debit: 0,
            credit: 500,
          },
        ],
      });

      assert.ok(res.journalEntryId);
      createdJeIds.push(res.journalEntryId);

      const lines = await db
        .select()
        .from(journalEntryLine)
        .where(eq(journalEntryLine.journalEntryId, res.journalEntryId));

      const taggedLine = lines.find((l) => l.accountId === expenseAccountId);
      assert.equal(taggedLine.analyticAccountId, activeAnalyticExpenseId);

      const untaggedLine = lines.find((l) => l.accountId === cashAccountId);
      assert.equal(untaggedLine.analyticAccountId, null);
    });

    it("rejects when analyticAccountId does not exist in the organization", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId,
            date: "2026-06-15",
            sourceType: "manual",
            sourceId: null,
            lines: [
              {
                accountId: expenseAccountId,
                analyticAccountId: "ana_non_existent",
                debit: 100,
                credit: 0,
              },
              {
                accountId: cashAccountId,
                debit: 0,
                credit: 100,
              },
            ],
          });
        },
        /Analytic account 'ana_non_existent' not found for organization/,
      );
    });

    it("rejects when analyticAccountId is archived", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId,
            date: "2026-06-15",
            sourceType: "manual",
            sourceId: null,
            lines: [
              {
                accountId: expenseAccountId,
                analyticAccountId: archivedAnalyticId,
                debit: 100,
                credit: 0,
              },
              {
                accountId: cashAccountId,
                debit: 0,
                credit: 100,
              },
            ],
          });
        },
        /is archived and cannot be used/,
      );
    });
  });

  describe("Part C & D: Budget and Budget Report Calculation", () => {
    it("creates a budget and calculates planned vs actual in budget report", async () => {
      testBudgetId = `bgt_test_${Date.now()}`;
      await db.insert(budget).values({
        id: testBudgetId,
        organizationId: orgId,
        name: "Q2 R&D Budget",
        periodStart: "2026-04-01",
        periodEnd: "2026-06-30",
        responsiblePersonId: testUserId,
        plannedAmount: "1000.00",
        analyticAccountId: activeAnalyticExpenseId,
      });

      // Post an entry within range tagged to this analytic account: $500 debit
      // That was done in previous test on date 2026-06-15!

      // Call getBudgetReport
      let reportData = null;
      const fakeReq = {
        organizationId: orgId,
        validatedQuery: { asOf: "2026-06-30" },
      };
      const fakeRes = {
        json: (data) => {
          reportData = data;
          return data;
        },
      };

      await getBudgetReport(fakeReq, fakeRes, (err) => {
        if (err) throw err;
      });

      assert.ok(Array.isArray(reportData));
      const targetBudget = reportData.find((b) => b.budgetId === testBudgetId);
      assert.ok(targetBudget, "Target budget should be present in report");

      assert.equal(targetBudget.budgetName, "Q2 R&D Budget");
      assert.equal(targetBudget.plannedAmount, 1000);
      assert.equal(targetBudget.actualAmount, 500);
      assert.equal(targetBudget.variance, 500);
      assert.equal(targetBudget.percentUsed, 50);

      // Now test asOf capping: if asOf is before 2026-06-15, say 2026-06-01, actualAmount should be 0
      fakeReq.validatedQuery.asOf = "2026-06-01";
      await getBudgetReport(fakeReq, fakeRes, (err) => {
        if (err) throw err;
      });
      const cappedBudget = reportData.find((b) => b.budgetId === testBudgetId);
      assert.equal(cappedBudget.actualAmount, 0);
      assert.equal(cappedBudget.variance, 1000);
      assert.equal(cappedBudget.percentUsed, 0);
    });
  });
});
