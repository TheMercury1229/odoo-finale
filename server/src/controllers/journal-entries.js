import { and, asc, desc, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
  chartOfAccounts,
  contact,
  journal,
  journalEntry,
  journalEntryLine,
} from "../db/schema.js";
import { postJournalEntry } from "../services/accounting/postJournalEntry.js";

export async function createJournalEntry(req, res, next) {
  try {
    const { date, journalId, reference, lines } = req.validatedBody;

    let createdResult;
    try {
      createdResult = await db.transaction(async (tx) => {
        const { journalEntryId } = await postJournalEntry(
          {
            organizationId: req.organizationId,
            journalId,
            date,
            reference: reference || null,
            sourceType: "manual",
            sourceId: null,
            lines,
          },
          tx,
        );

        const [entry] = await tx
          .select({
            id: journalEntry.id,
            organizationId: journalEntry.organizationId,
            journalId: journalEntry.journalId,
            journalName: journal.name,
            date: journalEntry.date,
            reference: journalEntry.reference,
            sourceType: journalEntry.sourceType,
            sourceId: journalEntry.sourceId,
            createdAt: journalEntry.createdAt,
          })
          .from(journalEntry)
          .leftJoin(journal, eq(journalEntry.journalId, journal.id))
          .where(eq(journalEntry.id, journalEntryId))
          .limit(1);

        const entryLines = await tx
          .select({
            id: journalEntryLine.id,
            journalEntryId: journalEntryLine.journalEntryId,
            accountId: journalEntryLine.accountId,
            accountName: chartOfAccounts.name,
            contactId: journalEntryLine.contactId,
            contactName: contact.name,
            debit: journalEntryLine.debit,
            credit: journalEntryLine.credit,
          })
          .from(journalEntryLine)
          .leftJoin(
            chartOfAccounts,
            eq(journalEntryLine.accountId, chartOfAccounts.id),
          )
          .leftJoin(contact, eq(journalEntryLine.contactId, contact.id))
          .where(eq(journalEntryLine.journalEntryId, journalEntryId))
          .orderBy(asc(journalEntryLine.id));

        return {
          ...entry,
          number: entry.reference ? entry.reference : `JE/${entry.id}`,
          status: "Posted",
          lines: entryLines,
        };
      });
    } catch (engineError) {
      return res.status(400).json({ error: engineError.message });
    }

    return res.status(201).json(createdResult);
  } catch (error) {
    return next(error);
  }
}

export async function listJournalEntries(req, res, next) {
  try {
    const filters = [eq(journalEntry.organizationId, req.organizationId)];
    const journalId = req.params.id || req.query.journalId;
    if (journalId) {
      filters.push(eq(journalEntry.journalId, journalId));
    }

    const rows = await db
      .select({
        id: journalEntry.id,
        date: journalEntry.date,
        reference: journalEntry.reference,
        sourceType: journalEntry.sourceType,
        journalId: journalEntry.journalId,
        journalName: journal.name,
        createdAt: journalEntry.createdAt,
        totalAmount:
          sql`coalesce(sum(${journalEntryLine.debit}), 0)`.as("total_amount"),
        contactNames:
          sql`coalesce(array_agg(distinct ${contact.name}) filter (where ${contact.name} is not null), array[]::text[])`.as("contact_names"),
      })
      .from(journalEntry)
      .leftJoin(journal, eq(journalEntry.journalId, journal.id))
      .leftJoin(
        journalEntryLine,
        eq(journalEntry.id, journalEntryLine.journalEntryId),
      )
      .leftJoin(contact, eq(journalEntryLine.contactId, contact.id))
      .where(and(...filters))
      .groupBy(
        journalEntry.id,
        journalEntry.date,
        journalEntry.reference,
        journalEntry.sourceType,
        journalEntry.journalId,
        journal.name,
        journalEntry.createdAt,
      )
      .orderBy(desc(journalEntry.date), desc(journalEntry.createdAt));

    const journalEntries = rows.map((row) => {
      const contacts = Array.isArray(row.contactNames)
        ? row.contactNames.filter(Boolean)
        : [];
      const partner = contacts.length === 1 ? contacts[0] : (contacts.length > 1 ? "—" : "—");

      return {
        id: row.id,
        date: row.date,
        number: row.reference ? row.reference : `JE/${row.id}`,
        reference: row.reference,
        partner,
        journalId: row.journalId,
        journalName: row.journalName,
        sourceType: row.sourceType,
        totalAmount: Number(row.totalAmount),
        status: "Posted",
        createdAt: row.createdAt,
      };
    });

    return res.json({ journalEntries });
  } catch (error) {
    return next(error);
  }
}

export async function getJournalEntry(req, res, next) {
  try {
    const { id } = req.params;
    const [entry] = await db
      .select({
        id: journalEntry.id,
        organizationId: journalEntry.organizationId,
        journalId: journalEntry.journalId,
        journalName: journal.name,
        date: journalEntry.date,
        reference: journalEntry.reference,
        sourceType: journalEntry.sourceType,
        sourceId: journalEntry.sourceId,
        createdAt: journalEntry.createdAt,
      })
      .from(journalEntry)
      .leftJoin(journal, eq(journalEntry.journalId, journal.id))
      .where(
        and(
          eq(journalEntry.id, id),
          eq(journalEntry.organizationId, req.organizationId),
        ),
      )
      .limit(1);

    if (!entry) {
      return res.status(404).json({ error: "Journal entry not found" });
    }

    const lines = await db
      .select({
        id: journalEntryLine.id,
        journalEntryId: journalEntryLine.journalEntryId,
        accountId: journalEntryLine.accountId,
        accountName: chartOfAccounts.name,
        contactId: journalEntryLine.contactId,
        contactName: contact.name,
        debit: journalEntryLine.debit,
        credit: journalEntryLine.credit,
      })
      .from(journalEntryLine)
      .leftJoin(
        chartOfAccounts,
        eq(journalEntryLine.accountId, chartOfAccounts.id),
      )
      .leftJoin(contact, eq(journalEntryLine.contactId, contact.id))
      .where(eq(journalEntryLine.journalEntryId, id))
      .orderBy(asc(journalEntryLine.id));

    return res.json({
      ...entry,
      number: entry.reference ? entry.reference : `JE/${entry.id}`,
      status: "Posted",
      lines,
    });
  } catch (error) {
    return next(error);
  }
}
