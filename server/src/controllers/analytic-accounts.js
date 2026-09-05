import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import db from "../config/db.js";
import { analyticAccount } from "../db/schema.js";

function analyticScope(organizationId, id) {
  return and(
    eq(analyticAccount.organizationId, organizationId),
    eq(analyticAccount.id, id),
  );
}

export async function listAnalyticAccounts(req, res, next) {
  try {
    const filters = [eq(analyticAccount.organizationId, req.organizationId)];

    if (req.query.includeArchived !== "true") {
      filters.push(eq(analyticAccount.isArchived, false));
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = `%${req.query.search.trim()}%`;
      filters.push(ilike(analyticAccount.name, search));
    }

    if (req.query.type === "income" || req.query.type === "expense") {
      filters.push(eq(analyticAccount.type, req.query.type));
    }

    const accounts = await db
      .select()
      .from(analyticAccount)
      .where(and(...filters))
      .orderBy(asc(analyticAccount.createdAt));

    return res.json({ analyticAccounts: accounts });
  } catch (error) {
    return next(error);
  }
}

export async function getAnalyticAccount(req, res, next) {
  try {
    const [account] = await db
      .select()
      .from(analyticAccount)
      .where(analyticScope(req.organizationId, req.params.id))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: "Analytic account not found" });
    }

    return res.json(account);
  } catch (error) {
    return next(error);
  }
}

export async function createAnalyticAccount(req, res, next) {
  try {
    const { name, type } = req.validatedBody;
    const trimmedName = name.trim();

    // Check for duplicate name in the same organization
    const [existing] = await db
      .select({ id: analyticAccount.id })
      .from(analyticAccount)
      .where(
        and(
          eq(analyticAccount.organizationId, req.organizationId),
          ilike(analyticAccount.name, trimmedName),
        ),
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: "An analytic account with this name already exists in your organization",
        field: "name",
      });
    }

    const id = `ana_${randomUUID()}`;
    const [created] = await db
      .insert(analyticAccount)
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

export async function updateAnalyticAccount(req, res, next) {
  try {
    const [current] = await db
      .select()
      .from(analyticAccount)
      .where(analyticScope(req.organizationId, req.params.id))
      .limit(1);

    if (!current) {
      return res.status(404).json({ error: "Analytic account not found" });
    }

    const updateData = {};
    if (req.validatedBody.name !== undefined) {
      const trimmedName = req.validatedBody.name.trim();

      const [conflict] = await db
        .select({ id: analyticAccount.id })
        .from(analyticAccount)
        .where(
          and(
            eq(analyticAccount.organizationId, req.organizationId),
            ilike(analyticAccount.name, trimmedName),
            sql`${analyticAccount.id} != ${req.params.id}`,
          ),
        )
        .limit(1);

      if (conflict) {
        return res.status(409).json({
          error: "An analytic account with this name already exists in your organization",
          field: "name",
        });
      }

      updateData.name = trimmedName;
    }

    if (req.validatedBody.type !== undefined) {
      updateData.type = req.validatedBody.type;
    }

    const [updated] = await db
      .update(analyticAccount)
      .set(updateData)
      .where(analyticScope(req.organizationId, req.params.id))
      .returning();

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function setArchived(req, res, next, isArchived) {
  try {
    const [updated] = await db
      .update(analyticAccount)
      .set({ isArchived })
      .where(analyticScope(req.organizationId, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Analytic account not found" });
    }

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export function archiveAnalyticAccount(req, res, next) {
  return setArchived(req, res, next, true);
}

export function unarchiveAnalyticAccount(req, res, next) {
  return setArchived(req, res, next, false);
}
