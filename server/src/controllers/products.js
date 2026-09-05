import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import db from "../config/db.js";
import { product } from "../db/schema.js";

const productTypes = ["goods", "service", "combo"];

function productScope(organizationId, id) {
  return and(eq(product.organizationId, organizationId), eq(product.id, id));
}

export async function createProduct(req, res, next) {
  try {
    const values = {
      ...req.validatedBody,
      // Store numeric prices as strings for the numeric column
      salesPrice: String(req.validatedBody.salesPrice),
      costPrice: String(req.validatedBody.costPrice),
      id: `product_${randomUUID()}`,
      organizationId: req.organizationId,
    };

    const [created] = await db.insert(product).values(values).returning();
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

export async function listProducts(req, res, next) {
  try {
    const filters = [eq(product.organizationId, req.organizationId)];

    if (req.query.includeArchived !== "true") {
      filters.push(eq(product.isArchived, false));
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = `%${req.query.search.trim()}%`;
      filters.push(
        or(ilike(product.name, search), ilike(product.category, search)),
      );
    }

    const products = await db
      .select()
      .from(product)
      .where(and(...filters))
      .orderBy(asc(product.name));

    if (req.query.view === "kanban") {
      return res.json({
        view: "kanban",
        groups: productTypes.map((type) => ({
          type,
          products: products.filter((item) => item.type === type),
        })),
      });
    }

    return res.json({ view: "list", products });
  } catch (error) {
    return next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const [result] = await db
      .select()
      .from(product)
      .where(productScope(req.organizationId, req.params.id))
      .limit(1);

    if (!result) return res.status(404).json({ error: "Product not found" });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const values = { ...req.validatedBody };

    // Convert numeric prices to strings for the numeric column
    if (values.salesPrice !== undefined) {
      values.salesPrice = String(values.salesPrice);
    }
    if (values.costPrice !== undefined) {
      values.costPrice = String(values.costPrice);
    }

    const [updated] = await db
      .update(product)
      .set(values)
      .where(productScope(req.organizationId, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Product not found" });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function setArchived(req, res, next, isArchived) {
  try {
    const [updated] = await db
      .update(product)
      .set({ isArchived })
      .where(productScope(req.organizationId, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Product not found" });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export function archiveProduct(req, res, next) {
  return setArchived(req, res, next, true);
}

export function unarchiveProduct(req, res, next) {
  return setArchived(req, res, next, false);
}
