import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike } from "drizzle-orm";
import db from "../config/db.js";
import { chartOfAccounts } from "../db/schema.js";

function coaScope(organizationId, id) {
  return and(
    eq(chartOfAccounts.organizationId, organizationId),
    eq(chartOfAccounts.id, id),
  );
}

export async function listAccounts(req, res, next) {
  try {
    const filters = [eq(chartOfAccounts.organizationId, req.organizationId)];

    if (req.query.includeArchived !== "true") {
      filters.push(eq(chartOfAccounts.isArchived, false));
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = `%${req.query.search.trim()}%`;
      filters.push(ilike(chartOfAccounts.name, search));
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...filters))
      .orderBy(asc(chartOfAccounts.createdAt));

    return res.json({ accounts });
  } catch (error) {
    return next(error);
  }
}

export async function createAccount(req, res, next) {
  try {
    const { name, type } = req.validatedBody;
    const trimmedName = name.trim();

    // Check for duplicate name in the same organization
    const [existing] = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, req.organizationId),
          ilike(chartOfAccounts.name, trimmedName),
        ),
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: "An account with this name already exists in your organization",
        field: "name",
      });
    }

    const id = `coa_${randomUUID()}`;
    const [created] = await db
      .insert(chartOfAccounts)
      .values({
        id,
        organizationId: req.organizationId,
        name: trimmedName,
        type,
        isArchived: false,
      })
      .returning();

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

async function setArchived(req, res, next, isArchived) {
  try {
    const [updated] = await db
      .update(chartOfAccounts)
      .set({ isArchived })
      .where(coaScope(req.organizationId, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export function archiveAccount(req, res, next) {
  return setArchived(req, res, next, true);
}

export function unarchiveAccount(req, res, next) {
  return setArchived(req, res, next, false);
}
