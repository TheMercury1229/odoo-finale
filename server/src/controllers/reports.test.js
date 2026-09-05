import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  round2,
  isCoreSeededAccount,
  getTodayDateString,
  getDefaultDateRange,
} from "./reports.js";
import {
  balanceSheetQuerySchema,
  profitLossQuerySchema,
} from "../validators/reports.js";

describe("Financial Reports Controller & Validator Tests", () => {
  describe("round2 helper", () => {
    it("rounds numbers to 2 decimal places", () => {
      assert.strictEqual(round2(10.556), 10.56);
      assert.strictEqual(round2(10.554), 10.55);
      assert.strictEqual(round2(100), 100);
      assert.strictEqual(round2(0), 0);
    });

    it("handles -0 by returning 0", () => {
      const negativeZero = -0;
      const result = round2(negativeZero);
      assert.strictEqual(Object.is(result, 0), true);
      assert.strictEqual(Object.is(result, -0), false);
    });

    it("handles null or undefined by returning 0", () => {
      assert.strictEqual(round2(null), 0);
      assert.strictEqual(round2(undefined), 0);
    });
  });

  describe("isCoreSeededAccount helper", () => {
    it("recognizes standard seeded account IDs", () => {
      assert.strictEqual(isCoreSeededAccount("coa_bank", "Bank"), true);
      assert.strictEqual(isCoreSeededAccount("coa_cash", "Cash"), true);
      assert.strictEqual(isCoreSeededAccount("coa_debtors", "Debtors"), true);
      assert.strictEqual(isCoreSeededAccount("coa_creditors", "Creditors"), true);
      assert.strictEqual(isCoreSeededAccount("coa_sales_income", "Sales Income"), true);
      assert.strictEqual(isCoreSeededAccount("coa_purchase_expense", "Purchase Expense"), true);
      assert.strictEqual(isCoreSeededAccount("coa_capital", "Capital"), true);
    });

    it("recognizes standard names even if custom ID", () => {
      assert.strictEqual(isCoreSeededAccount("custom_123", "Bank"), true);
      assert.strictEqual(isCoreSeededAccount("custom_456", "creditors"), true);
    });

    it("returns false for non-core accounts", () => {
      assert.strictEqual(isCoreSeededAccount("acc_office_supplies", "Office Supplies"), false);
      assert.strictEqual(isCoreSeededAccount("acc_custom", "Custom Consulting"), false);
    });
  });

  describe("Date defaults", () => {
    it("returns valid YYYY-MM-DD for getTodayDateString", () => {
      const today = getTodayDateString();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns valid start-of-month and today for getDefaultDateRange", () => {
      const range = getDefaultDateRange();
      assert.match(range.from, /^\d{4}-\d{2}-01$/);
      assert.match(range.to, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(range.from <= range.to);
    });
  });

  describe("Validator: balanceSheetQuerySchema", () => {
    it("accepts valid asOf date", () => {
      const result = balanceSheetQuerySchema.safeParse({ asOf: "2026-09-05" });
      assert.strictEqual(result.success, true);
    });

    it("accepts empty query", () => {
      const result = balanceSheetQuerySchema.safeParse({});
      assert.strictEqual(result.success, true);
    });

    it("rejects invalid date strings", () => {
      const result = balanceSheetQuerySchema.safeParse({ asOf: "2026-02-31" });
      assert.strictEqual(result.success, false);
    });

    it("rejects malformed date strings", () => {
      const result = balanceSheetQuerySchema.safeParse({ asOf: "invalid-date" });
      assert.strictEqual(result.success, false);
    });
  });

  describe("Validator: profitLossQuerySchema", () => {
    it("accepts valid from and to dates", () => {
      const result = profitLossQuerySchema.safeParse({
        from: "2026-01-01",
        to: "2026-09-05",
      });
      assert.strictEqual(result.success, true);
    });

    it("accepts empty query", () => {
      const result = profitLossQuerySchema.safeParse({});
      assert.strictEqual(result.success, true);
    });

    it("rejects when from is after to", () => {
      const result = profitLossQuerySchema.safeParse({
        from: "2026-09-05",
        to: "2026-01-01",
      });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.issues[0].message, "'from' date cannot be after 'to' date");
    });

    it("rejects invalid date format", () => {
      const result = profitLossQuerySchema.safeParse({
        from: "not-a-date",
        to: "2026-09-05",
      });
      assert.strictEqual(result.success, false);
    });
  });
});
