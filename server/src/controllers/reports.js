import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import db from "../config/db.js";
import { chartOfAccounts, journalEntry, journalEntryLine } from "../db/schema.js";

const CORE_SEEDED_ACCOUNT_IDS = new Set([
  "coa_bank",
  "coa_cash",
  "coa_debtors",
  "coa_creditors",
  "coa_sales_income",
  "coa_purchase_expense",
  "coa_capital",
]);

const CORE_SEEDED_NAMES = new Set([
  "bank",
  "cash",
  "debtors",
  "creditors",
  "sales income",
  "purchase expense",
  "capital",
]);

export function isCoreSeededAccount(accountId, accountName) {
  if (accountId && CORE_SEEDED_ACCOUNT_IDS.has(accountId)) return true;
  if (accountName && CORE_SEEDED_NAMES.has(accountName.toLowerCase().trim())) return true;
  return false;
}

export function round2(num) {
  const val = Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
  return Object.is(val, -0) ? 0 : val;
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function getDefaultDateRange() {
  const today = getTodayDateString();
  const startOfMonth = `${today.slice(0, 7)}-01`;
  return { from: startOfMonth, to: today };
}

function shouldIncludeAccount(row, balance) {
  const hasNonZeroBalance = Math.abs(balance) > 0.0001;
  const hasActivity = Number(row.lineCount) > 0;
  const isCoreSeeded = !row.isArchived && isCoreSeededAccount(row.accountId, row.accountName);
  return hasNonZeroBalance || hasActivity || isCoreSeeded;
}

/**
 * GET /api/reports/balance-sheet?asOf=YYYY-MM-DD
 */
export async function getBalanceSheet(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const asOf = req.validatedQuery?.asOf || getTodayDateString();

    // 1. Aggregation subquery on journal_entry_line joined with journal_entry
    const entryTotals = db
      .select({
        accountId: journalEntryLine.accountId,
        totalDebit: sql`coalesce(sum(${journalEntryLine.debit}), 0)`.as("total_debit"),
        totalCredit: sql`coalesce(sum(${journalEntryLine.credit}), 0)`.as("total_credit"),
        lineCount: sql`count(${journalEntryLine.id})`.as("line_count"),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
      .where(
        and(
          eq(journalEntry.organizationId, organizationId),
          lte(journalEntry.date, asOf),
        ),
      )
      .groupBy(journalEntryLine.accountId)
      .as("entry_totals");

    // 2. Query chart_of_accounts joined with aggregated subquery
    const rows = await db
      .select({
        accountId: chartOfAccounts.id,
        accountName: chartOfAccounts.name,
        type: chartOfAccounts.type,
        isArchived: chartOfAccounts.isArchived,
        totalDebit: sql`coalesce(${entryTotals.totalDebit}, 0)`.as("total_debit"),
        totalCredit: sql`coalesce(${entryTotals.totalCredit}, 0)`.as("total_credit"),
        lineCount: sql`coalesce(${entryTotals.lineCount}, 0)`.as("line_count"),
      })
      .from(chartOfAccounts)
      .leftJoin(entryTotals, eq(chartOfAccounts.id, entryTotals.accountId))
      .where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          inArray(chartOfAccounts.type, ["asset", "liability", "capital"]),
        ),
      )
      .orderBy(asc(chartOfAccounts.name));

    const assets = [];
    const liabilities = [];
    const capital = [];

    for (const row of rows) {
      const debit = Number(row.totalDebit);
      const credit = Number(row.totalCredit);

      let rawBalance = 0;
      if (row.type === "asset") {
        // Assets are debit-normal
        rawBalance = debit - credit;
      } else {
        // Liabilities & Capital are credit-normal
        rawBalance = credit - debit;
      }

      const balance = round2(rawBalance);

      if (!shouldIncludeAccount(row, balance)) {
        continue;
      }

      const entry = {
        accountId: row.accountId,
        accountName: row.accountName,
        balance,
      };

      if (row.type === "asset") {
        assets.push(entry);
      } else if (row.type === "liability") {
        liabilities.push(entry);
      } else if (row.type === "capital") {
        capital.push(entry);
      }
    }

    const totalAssets = round2(assets.reduce((sum, item) => sum + item.balance, 0));
    const totalLiabilities = round2(liabilities.reduce((sum, item) => sum + item.balance, 0));
    const totalCapital = round2(capital.reduce((sum, item) => sum + item.balance, 0));
    const totalLiabilitiesAndCapital = round2(totalLiabilities + totalCapital);

    return res.json({
      asOf,
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      capital,
      totalCapital,
      totalLiabilitiesAndCapital,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getProfitLoss(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const defaults = getDefaultDateRange();

    let from = req.validatedQuery?.from;
    let to = req.validatedQuery?.to;

    if (!from && !to) {
      from = defaults.from;
      to = defaults.to;
    } else if (from && !to) {
      to = defaults.to;
    } else if (!from && to) {
      from = `${to.slice(0, 7)}-01`;
    }

    if (from > to) {
      return res.status(400).json({
        error: "'from' date cannot be after 'to' date",
        field: "from",
      });
    }

    // 1. Aggregation subquery on journal_entry_line joined with journal_entry
    const entryTotals = db
      .select({
        accountId: journalEntryLine.accountId,
        totalDebit: sql`coalesce(sum(${journalEntryLine.debit}), 0)`.as("total_debit"),
        totalCredit: sql`coalesce(sum(${journalEntryLine.credit}), 0)`.as("total_credit"),
        lineCount: sql`count(${journalEntryLine.id})`.as("line_count"),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
      .where(
        and(
          eq(journalEntry.organizationId, organizationId),
          gte(journalEntry.date, from),
          lte(journalEntry.date, to),
        ),
      )
      .groupBy(journalEntryLine.accountId)
      .as("entry_totals");

    // 2. Query chart_of_accounts joined with aggregated subquery
    const rows = await db
      .select({
        accountId: chartOfAccounts.id,
        accountName: chartOfAccounts.name,
        type: chartOfAccounts.type,
        isArchived: chartOfAccounts.isArchived,
        totalDebit: sql`coalesce(${entryTotals.totalDebit}, 0)`.as("total_debit"),
        totalCredit: sql`coalesce(${entryTotals.totalCredit}, 0)`.as("total_credit"),
        lineCount: sql`coalesce(${entryTotals.lineCount}, 0)`.as("line_count"),
      })
      .from(chartOfAccounts)
      .leftJoin(entryTotals, eq(chartOfAccounts.id, entryTotals.accountId))
      .where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          inArray(chartOfAccounts.type, ["income", "expense"]),
        ),
      )
      .orderBy(asc(chartOfAccounts.name));

    const income = [];
    const expenses = [];

    for (const row of rows) {
      const debit = Number(row.totalDebit);
      const credit = Number(row.totalCredit);

      let rawBalance = 0;
      if (row.type === "income") {
        // Income is credit-normal
        rawBalance = credit - debit;
      } else {
        // Expense is debit-normal
        rawBalance = debit - credit;
      }

      const balance = round2(rawBalance);

      if (!shouldIncludeAccount(row, balance)) {
        continue;
      }

      const entry = {
        accountId: row.accountId,
        accountName: row.accountName,
        balance,
      };

      if (row.type === "income") {
        income.push(entry);
      } else if (row.type === "expense") {
        expenses.push(entry);
      }
    }

    const totalIncome = round2(income.reduce((sum, item) => sum + item.balance, 0));
    const totalExpenses = round2(expenses.reduce((sum, item) => sum + item.balance, 0));
    const netProfit = round2(totalIncome - totalExpenses);

    return res.json({
      from,
      to,
      income,
      totalIncome,
      expenses,
      totalExpenses,
      netProfit,
    });
  } catch (error) {
    return next(error);
  }
}
