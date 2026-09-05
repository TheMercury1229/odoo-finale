import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike } from "drizzle-orm";
import db from "../config/db.js";
import { chartOfAccounts, journal } from "../db/schema.js";

export async function listJournals(req, res, next) {
  try {
    const rows = await db
      .select({
        id: journal.id,
        organizationId: journal.organizationId,
        name: journal.name,
        type: journal.type,
        defaultAccountId: journal.defaultAccountId,
        createdAt: journal.createdAt,
        accountId: chartOfAccounts.id,
        accountName: chartOfAccounts.name,
        accountType: chartOfAccounts.type,
      })
      .from(journal)
      .leftJoin(
        chartOfAccounts,
        and(
          eq(journal.defaultAccountId, chartOfAccounts.id),
          eq(chartOfAccounts.organizationId, req.organizationId),
        ),
      )
      .where(eq(journal.organizationId, req.organizationId))
      .orderBy(asc(journal.createdAt));

    const journals = rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      type: row.type,
      defaultAccountId: row.defaultAccountId,
      createdAt: row.createdAt,
      defaultAccount:
        row.defaultAccountId && row.accountName
          ? {
              accountId: row.defaultAccountId,
              accountName: row.accountName,
              accountType: row.accountType,
            }
          : null,
    }));

    return res.json({ journals });
  } catch (error) {
    return next(error);
  }
}

export async function createJournal(req, res, next) {
  try {
    const { name, type, defaultAccountId } = req.validatedBody;
    let linkedAccount = null;

    // Validate defaultAccountId if provided
    if (defaultAccountId) {
      const [accountRow] = await db
        .select({
          id: chartOfAccounts.id,
          name: chartOfAccounts.name,
          type: chartOfAccounts.type,
        })
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.id, defaultAccountId),
            eq(chartOfAccounts.organizationId, req.organizationId),
          ),
        )
        .limit(1);

      if (!accountRow) {
        return res.status(400).json({
          error: "Default account not found in this organization",
          field: "defaultAccountId",
        });
      }

      linkedAccount = accountRow;
    }

    // Enforce unique journal name per organization
    const [existingJournal] = await db
      .select({ id: journal.id })
      .from(journal)
      .where(
        and(
          eq(journal.organizationId, req.organizationId),
          ilike(journal.name, name.trim()),
        ),
      )
      .limit(1);

    if (existingJournal) {
      return res.status(409).json({
        error: `A journal with the name "${name.trim()}" already exists in this organization`,
        field: "name",
      });
    }

    const id = `journal_${randomUUID()}`;
    const [created] = await db
      .insert(journal)
      .values({
        id,
        organizationId: req.organizationId,
        name: name.trim(),
        type,
        defaultAccountId: linkedAccount ? linkedAccount.id : null,
      })
      .returning();

    return res.status(201).json({
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      type: created.type,
      defaultAccountId: created.defaultAccountId,
      createdAt: created.createdAt,
      defaultAccount: linkedAccount
        ? {
            accountId: linkedAccount.id,
            accountName: linkedAccount.name,
            accountType: linkedAccount.type,
          }
        : null,
    });
  } catch (error) {
    return next(error);
  }
}
