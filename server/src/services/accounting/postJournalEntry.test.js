import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import db from "../../config/db.js";
import {
  chartOfAccounts,
  contact,
  journal,
  journalEntry,
  journalEntryLine,
  organization,
} from "../../db/schema.js";
import {
  postJournalEntry,
  getAccountIdByName,
} from "./postJournalEntry.js";

describe("Accounting Engine: postJournalEntry & getAccountIdByName", () => {
  const orgId = "org_urban_furniture";
  const validJournalId = "journal_cash";
  const cashAccountId = "coa_cash";
  const salesAccountId = "coa_sales_income";
  const debtorsAccountId = "coa_debtors";

  // Keep track of any created journal entries for guaranteed cleanup
  const createdJournalEntryIds = [];

  // Helper to ensure test contacts or cleanups
  let testContactId = null;
  let testCashAdvanceAccountId = null;

  before(async () => {
    // Verify database connection and seed data
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    assert.ok(
      org,
      `Organization '${orgId}' must exist in the database (run seed script if needed)`,
    );

    // Create a temporary test contact for line contact testing
    testContactId = `con_test_${Date.now()}`;
    await db.insert(contact).values({
      id: testContactId,
      organizationId: orgId,
      name: "Test Contact Accounting",
      type: "customer",
    });

    // Create a temporary "Cash Advance" account to test exact vs similar name matching
    testCashAdvanceAccountId = `coa_test_cash_advance_${Date.now()}`;
    await db.insert(chartOfAccounts).values({
      id: testCashAdvanceAccountId,
      organizationId: orgId,
      name: "Cash Advance",
      type: "asset",
    });
  });

  after(async () => {
    // Clean up test contact
    if (testContactId) {
      await db.delete(contact).where(eq(contact.id, testContactId));
    }

    // Clean up test cash advance account
    if (testCashAdvanceAccountId) {
      await db
        .delete(chartOfAccounts)
        .where(eq(chartOfAccounts.id, testCashAdvanceAccountId));
    }

    // Clean up any test journal entries created during integration tests
    if (createdJournalEntryIds.length > 0) {
      await db
        .delete(journalEntry)
        .where(inArray(journalEntry.id, createdJournalEntryIds));
    }
  });

  // ===========================================================================
  // 1. Validation Tests (Strict double-entry rules before DB writes)
  // ===========================================================================
  describe("Validation Rules", () => {
    it("rejects lines.length < 2 (empty lines)", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [],
          });
        },
        {
          name: "Error",
          message: "Journal entry must have at least 2 lines",
        },
      );
    });

    it("rejects lines.length < 2 (single line)", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [{ accountId: cashAccountId, debit: 100, credit: 0 }],
          });
        },
        {
          name: "Error",
          message: "Journal entry must have at least 2 lines",
        },
      );
    });

    it("rejects a line with both debit and credit set", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 50 },
              { accountId: salesAccountId, debit: 0, credit: 50 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Line 0 has both debit and credit set.*never both/i,
          );
          return true;
        },
      );
    });

    it("rejects a line with neither debit nor credit set (both zero)", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 0, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Line 0 has neither debit nor credit set/i,
          );
          return true;
        },
      );
    });

    it("rejects a line with a negative amount", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: -100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(err.message, /Line 0 has a negative amount/i);
          return true;
        },
      );

      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: -100 },
            ],
          });
        },
        (err) => {
          assert.match(err.message, /Line 1 has a negative amount/i);
          return true;
        },
      );
    });

    it("rejects when debit sum != credit sum (including near-miss 100.00 vs 100.01)", async () => {
      // Near miss: 100.00 vs 100.01
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 100.0, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100.01 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Journal entry lines do not balance: total debit \(100\.00\) != total credit \(100\.01\)/,
          );
          return true;
        },
      );

      // Gross mismatch: 200.00 vs 100.00
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 200.0, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100.0 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Journal entry lines do not balance: total debit \(200\.00\) != total credit \(100\.00\)/,
          );
          return true;
        },
      );
    });

    it("rejects sourceType='manual' with a non-null sourceId", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: "accidental_source_id",
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        {
          name: "Error",
          message: "sourceId must be null when sourceType is 'manual'",
        },
      );
    });

    it("rejects a non-manual sourceType with a null or empty sourceId", async () => {
      // Null sourceId for customer_invoice
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "customer_invoice",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        {
          name: "Error",
          message:
            "sourceId is required when sourceType is 'customer_invoice'",
        },
      );

      // Undefined sourceId for vendor_bill
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "vendor_bill",
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        {
          name: "Error",
          message: "sourceId is required when sourceType is 'vendor_bill'",
        },
      );

      // Whitespace-only sourceId for payment
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "payment",
            sourceId: "   ",
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        {
          name: "Error",
          message: "sourceId is required when sourceType is 'payment'",
        },
      );
    });

    it("rejects invalid or unsupported sourceType", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "invalid_type",
            sourceId: "some_id",
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(err.message, /Invalid sourceType 'invalid_type'/);
          return true;
        },
      );
    });
  });

  // ===========================================================================
  // 2. Cross-Organization Scoping / Defense-in-depth Tests
  // ===========================================================================
  describe("Cross-Organization Scoping Checks", () => {
    it("rejects a non-existent or foreign organization journalId", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: "journal_non_existent",
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: cashAccountId, debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Journal 'journal_non_existent' not found for organization/,
          );
          return true;
        },
      );
    });

    it("rejects an accountId not belonging to the organization", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              { accountId: "coa_fake_account", debit: 100, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Account 'coa_fake_account' not found for organization/,
          );
          return true;
        },
      );
    });

    it("rejects a contactId not belonging to the organization", async () => {
      await assert.rejects(
        async () => {
          await postJournalEntry({
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            sourceType: "manual",
            sourceId: null,
            lines: [
              {
                accountId: cashAccountId,
                contactId: "con_non_existent",
                debit: 100,
                credit: 0,
              },
              { accountId: salesAccountId, debit: 0, credit: 100 },
            ],
          });
        },
        (err) => {
          assert.match(
            err.message,
            /Contact 'con_non_existent' not found for organization/,
          );
          return true;
        },
      );
    });
  });

  // ===========================================================================
  // 3. Account Resolution Helper: getAccountIdByName
  // ===========================================================================
  describe("getAccountIdByName", () => {
    it("returns the correct account ID for an exact existing account name", async () => {
      const id = await getAccountIdByName(orgId, "Cash");
      assert.equal(id, "coa_cash");

      const bankId = await getAccountIdByName(orgId, "Bank");
      assert.equal(bankId, "coa_bank");

      const salesId = await getAccountIdByName(orgId, "Sales Income");
      assert.equal(salesId, "coa_sales_income");
    });

    it("only exact-matches and does not match similarly-named accounts (e.g. Cash vs Cash Advance)", async () => {
      // Exactly "Cash" returns coa_cash
      const cashId = await getAccountIdByName(orgId, "Cash");
      assert.equal(cashId, "coa_cash");

      // Exactly "Cash Advance" returns testCashAdvanceAccountId
      const cashAdvanceId = await getAccountIdByName(orgId, "Cash Advance");
      assert.equal(cashAdvanceId, testCashAdvanceAccountId);

      // Suffixes, partials, or fuzzy names must NOT match
      await assert.rejects(
        async () => {
          await getAccountIdByName(orgId, "Cash A/c");
        },
        {
          name: "Error",
          message:
            "Account 'Cash A/c' not found for organization 'org_urban_furniture' — check seed data",
        },
      );

      await assert.rejects(
        async () => {
          await getAccountIdByName(orgId, "Cash Adv");
        },
        {
          name: "Error",
          message:
            "Account 'Cash Adv' not found for organization 'org_urban_furniture' — check seed data",
        },
      );
    });

    it("throws a clear error when account name is not found", async () => {
      await assert.rejects(
        async () => {
          await getAccountIdByName(orgId, "Non Existent Account");
        },
        {
          name: "Error",
          message:
            "Account 'Non Existent Account' not found for organization 'org_urban_furniture' — check seed data",
        },
      );
    });

    it("works within an existing transaction", async () => {
      await db.transaction(async (tx) => {
        const id = await getAccountIdByName(orgId, "Bank", tx);
        assert.equal(id, "coa_bank");
      });
    });
  });

  // ===========================================================================
  // 4. Successful Posting (Atomic Inserts)
  // ===========================================================================
  describe("Successful Journal Entry Creation", () => {
    it("successfully creates entry + lines when everything is valid and returns journalEntryId", async () => {
      const result = await postJournalEntry({
        organizationId: orgId,
        journalId: validJournalId,
        date: "2026-09-05",
        reference: "TEST-MANUAL-001",
        sourceType: "manual",
        sourceId: null,
        lines: [
          {
            accountId: cashAccountId,
            contactId: testContactId,
            debit: 450.5,
            credit: 0,
          },
          {
            accountId: salesAccountId,
            debit: 0,
            credit: 450.5,
          },
        ],
      });

      assert.ok(result);
      assert.ok(result.journalEntryId);
      assert.match(result.journalEntryId, /^je_/);
      createdJournalEntryIds.push(result.journalEntryId);

      // Verify journal_entry row in DB
      const [entryRow] = await db
        .select()
        .from(journalEntry)
        .where(eq(journalEntry.id, result.journalEntryId));

      assert.ok(entryRow);
      assert.equal(entryRow.organizationId, orgId);
      assert.equal(entryRow.journalId, validJournalId);
      assert.equal(entryRow.date, "2026-09-05");
      assert.equal(entryRow.reference, "TEST-MANUAL-001");
      assert.equal(entryRow.sourceType, "manual");
      assert.equal(entryRow.sourceId, null);

      // Verify journal_entry_line rows in DB
      const lineRows = await db
        .select()
        .from(journalEntryLine)
        .where(eq(journalEntryLine.journalEntryId, result.journalEntryId));

      assert.equal(lineRows.length, 2);

      const debitLine = lineRows.find((l) => Number(l.debit) > 0);
      const creditLine = lineRows.find((l) => Number(l.credit) > 0);

      assert.ok(debitLine);
      assert.equal(debitLine.accountId, cashAccountId);
      assert.equal(debitLine.contactId, testContactId);
      assert.equal(debitLine.debit, "450.50");
      assert.equal(debitLine.credit, "0.00");

      assert.ok(creditLine);
      assert.equal(creditLine.accountId, salesAccountId);
      assert.equal(creditLine.contactId, null);
      assert.equal(creditLine.debit, "0.00");
      assert.equal(creditLine.credit, "450.50");
    });

    it("successfully creates multi-line entries (e.g. 3 lines: split debit, single credit)", async () => {
      const result = await postJournalEntry({
        organizationId: orgId,
        journalId: validJournalId,
        date: "2026-09-05",
        reference: "SPLIT-ENTRY-001",
        sourceType: "payment",
        sourceId: "pay_test_123",
        lines: [
          { accountId: cashAccountId, debit: 200.0, credit: 0 },
          { accountId: debtorsAccountId, debit: 300.0, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: 500.0 },
        ],
      });

      assert.ok(result.journalEntryId);
      createdJournalEntryIds.push(result.journalEntryId);

      const lineRows = await db
        .select()
        .from(journalEntryLine)
        .where(eq(journalEntryLine.journalEntryId, result.journalEntryId));

      assert.equal(lineRows.length, 3);
    });
  });

  // ===========================================================================
  // 5. Transaction Participation & Rollback Tests
  // ===========================================================================
  describe("Transaction Participation & Rollback", () => {
    it("correctly participates in and rolls back with an existing external transaction", async () => {
      let rolledBackEntryId = null;

      await assert.rejects(
        async () => {
          await db.transaction(async (tx) => {
            const { journalEntryId } = await postJournalEntry(
              {
                organizationId: orgId,
                journalId: validJournalId,
                date: "2026-09-05",
                reference: "WILL-ROLLBACK",
                sourceType: "manual",
                sourceId: null,
                lines: [
                  { accountId: cashAccountId, debit: 125, credit: 0 },
                  { accountId: salesAccountId, debit: 0, credit: 125 },
                ],
              },
              tx,
            );

            rolledBackEntryId = journalEntryId;

            // Verify entry was inserted inside this transaction
            const [insideTxEntry] = await tx
              .select({ id: journalEntry.id })
              .from(journalEntry)
              .where(eq(journalEntry.id, journalEntryId));

            assert.ok(
              insideTxEntry,
              "Entry should be queryable within active transaction",
            );

            // Simulate caller failure (e.g. subsequent business validation or bill update fails)
            throw new Error("Simulated caller transaction failure");
          });
        },
        {
          name: "Error",
          message: "Simulated caller transaction failure",
        },
      );

      // Verify that after transaction aborts, NO journal entry row exists in DB
      assert.ok(rolledBackEntryId, "Should have returned an ID before rollback");

      const [persistedEntry] = await db
        .select({ id: journalEntry.id })
        .from(journalEntry)
        .where(eq(journalEntry.id, rolledBackEntryId));

      assert.equal(
        persistedEntry,
        undefined,
        "Journal entry must have been rolled back and not persisted",
      );

      // Verify no orphaned lines exist either
      const orphanedLines = await db
        .select({ id: journalEntryLine.id })
        .from(journalEntryLine)
        .where(eq(journalEntryLine.journalEntryId, rolledBackEntryId));

      assert.equal(orphanedLines.length, 0);
    });

    it("correctly commits when external transaction succeeds", async () => {
      let committedEntryId = null;

      await db.transaction(async (tx) => {
        const { journalEntryId } = await postJournalEntry(
          {
            organizationId: orgId,
            journalId: validJournalId,
            date: "2026-09-05",
            reference: "WILL-COMMIT-EXT-TX",
            sourceType: "customer_invoice",
            sourceId: "inv_test_commit",
            lines: [
              { accountId: cashAccountId, debit: 75.25, credit: 0 },
              { accountId: salesAccountId, debit: 0, credit: 75.25 },
            ],
          },
          tx,
        );

        committedEntryId = journalEntryId;
      });

      assert.ok(committedEntryId);
      createdJournalEntryIds.push(committedEntryId);

      const [persistedEntry] = await db
        .select({ id: journalEntry.id })
        .from(journalEntry)
        .where(eq(journalEntry.id, committedEntryId));

      assert.ok(
        persistedEntry,
        "Journal entry should be committed when caller transaction succeeds",
      );
    });
  });
});
