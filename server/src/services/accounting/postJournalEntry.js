import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import db from "../../config/db.js";
import {
  chartOfAccounts,
  contact,
  journal,
  journalEntry,
  journalEntryLine,
} from "../../db/schema.js";

const VALID_SOURCE_TYPES = new Set([
  "vendor_bill",
  "customer_invoice",
  "payment",
  "manual",
]);

/**
 * Validates and posts a balanced double-entry journal entry atomically.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.journalId
 * @param {string} params.date - YYYY-MM-DD
 * @param {string | null} [params.reference]
 * @param {'vendor_bill' | 'customer_invoice' | 'payment' | 'manual'} params.sourceType
 * @param {string | null} [params.sourceId] - null only when sourceType === 'manual'
 * @param {Array<{ accountId: string, contactId?: string | null, debit: number, credit: number }>} params.lines
 * @param {any} [tx] - Optional existing Drizzle transaction
 * @returns {Promise<{ journalEntryId: string }>}
 */
export async function postJournalEntry(
  {
    organizationId,
    journalId,
    date,
    reference = null,
    sourceType,
    sourceId = null,
    lines,
  },
  tx,
) {
  // ---------------------------------------------------------------------------
  // 1. Basic Parameter Validations
  // ---------------------------------------------------------------------------
  if (!organizationId || typeof organizationId !== "string") {
    throw new Error("organizationId is required");
  }

  if (!journalId || typeof journalId !== "string") {
    throw new Error("journalId is required");
  }

  if (!date || typeof date !== "string") {
    throw new Error("date is required (YYYY-MM-DD)");
  }

  if (!VALID_SOURCE_TYPES.has(sourceType)) {
    throw new Error(
      `Invalid sourceType '${sourceType}'. Must be one of: vendor_bill, customer_invoice, payment, manual`,
    );
  }

  if (sourceType === "manual") {
    if (sourceId !== null && sourceId !== undefined) {
      throw new Error("sourceId must be null when sourceType is 'manual'");
    }
  } else {
    if (
      sourceId === null ||
      sourceId === undefined ||
      String(sourceId).trim() === ""
    ) {
      throw new Error(`sourceId is required when sourceType is '${sourceType}'`);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Lines Structure & Balancing Validations
  // ---------------------------------------------------------------------------
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error("Journal entry must have at least 2 lines");
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;
  const validatedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line || typeof line !== "object") {
      throw new Error(`Line ${i} is invalid`);
    }

    if (
      !line.accountId ||
      typeof line.accountId !== "string" ||
      !line.accountId.trim()
    ) {
      throw new Error(`Line ${i} must have a valid accountId`);
    }

    const { debit, credit } = line;

    if (
      typeof debit !== "number" ||
      Number.isNaN(debit) ||
      typeof credit !== "number" ||
      Number.isNaN(credit)
    ) {
      throw new Error(
        `Line ${i} has non-numeric debit or credit: debit=${debit}, credit=${credit}`,
      );
    }

    if (debit < 0 || credit < 0) {
      throw new Error(
        `Line ${i} has a negative amount: debit=${debit}, credit=${credit}`,
      );
    }

    if (debit > 0 && credit > 0) {
      throw new Error(
        `Line ${i} has both debit and credit set: debit=${debit}, credit=${credit}. A line must have either debit > 0 or credit > 0, never both.`,
      );
    }

    if (debit === 0 && credit === 0) {
      throw new Error(
        `Line ${i} has neither debit nor credit set: both are 0. A line must have either debit > 0 or credit > 0.`,
      );
    }

    // Multiply by 100 and round to avoid floating-point comparison bugs
    const lineDebitCents = Math.round(debit * 100);
    const lineCreditCents = Math.round(credit * 100);

    totalDebitCents += lineDebitCents;
    totalCreditCents += lineCreditCents;

    validatedLines.push({
      accountId: line.accountId.trim(),
      contactId:
        line.contactId &&
        typeof line.contactId === "string" &&
        line.contactId.trim()
          ? line.contactId.trim()
          : null,
      debit: (lineDebitCents / 100).toFixed(2),
      credit: (lineCreditCents / 100).toFixed(2),
    });
  }

  if (totalDebitCents !== totalCreditCents) {
    const totalDebit = (totalDebitCents / 100).toFixed(2);
    const totalCredit = (totalCreditCents / 100).toFixed(2);
    throw new Error(
      `Journal entry lines do not balance: total debit (${totalDebit}) != total credit (${totalCredit})`,
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Cross-Organization References Check (Defense-in-depth)
  // ---------------------------------------------------------------------------
  const executor = tx || db;

  // Validate Journal
  const [journalRow] = await executor
    .select({ id: journal.id })
    .from(journal)
    .where(
      and(
        eq(journal.id, journalId),
        eq(journal.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!journalRow) {
    throw new Error(
      `Journal '${journalId}' not found for organization '${organizationId}'`,
    );
  }

  // Validate Accounts
  const uniqueAccountIds = [
    ...new Set(validatedLines.map((l) => l.accountId)),
  ];
  const accountRows = await executor
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.organizationId, organizationId),
        inArray(chartOfAccounts.id, uniqueAccountIds),
      ),
    );

  const foundAccountIds = new Set(accountRows.map((a) => a.id));
  for (const accId of uniqueAccountIds) {
    if (!foundAccountIds.has(accId)) {
      throw new Error(
        `Account '${accId}' not found for organization '${organizationId}'`,
      );
    }
  }

  // Validate Contacts (if any line has a contactId)
  const uniqueContactIds = [
    ...new Set(
      validatedLines
        .map((l) => l.contactId)
        .filter(Boolean),
    ),
  ];

  if (uniqueContactIds.length > 0) {
    const contactRows = await executor
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(
          eq(contact.organizationId, organizationId),
          inArray(contact.id, uniqueContactIds),
        ),
      );

    const foundContactIds = new Set(contactRows.map((c) => c.id));
    for (const conId of uniqueContactIds) {
      if (!foundContactIds.has(conId)) {
        throw new Error(
          `Contact '${conId}' not found for organization '${organizationId}'`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Atomic Database Inserts
  // ---------------------------------------------------------------------------
  async function executeInserts(client) {
    const journalEntryId = `je_${randomUUID()}`;

    await client.insert(journalEntry).values({
      id: journalEntryId,
      organizationId,
      journalId,
      date,
      reference: reference ?? null,
      sourceType,
      sourceId: sourceId ?? null,
    });

    const lineRows = validatedLines.map((l) => ({
      id: `jel_${randomUUID()}`,
      journalEntryId,
      accountId: l.accountId,
      contactId: l.contactId,
      debit: l.debit,
      credit: l.credit,
    }));

    await client.insert(journalEntryLine).values(lineRows);

    return { journalEntryId };
  }

  if (tx) {
    return await executeInserts(tx);
  }

  return await db.transaction(async (internalTx) => {
    return await executeInserts(internalTx);
  });
}

/**
 * Resolves an account ID by account name within an organization.
 *
 * @param {string} organizationId
 * @param {string} name
 * @param {any} [tx] - Optional existing Drizzle transaction
 * @returns {Promise<string>} Account ID
 */
export async function getAccountIdByName(organizationId, name, tx) {
  if (!organizationId || typeof organizationId !== "string") {
    throw new Error("organizationId is required");
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Account name is required");
  }

  const executor = tx || db;
  const trimmedName = name.trim();

  const [account] = await executor
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.organizationId, organizationId),
        eq(chartOfAccounts.name, trimmedName),
      ),
    )
    .limit(1);

  if (!account) {
    throw new Error(
      `Account '${trimmedName}' not found for organization '${organizationId}' — check seed data`,
    );
  }

  return account.id;
}

export default postJournalEntry;
