import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike, ne, or } from "drizzle-orm";
import db from "../config/db.js";
import { contact, user } from "../db/schema.js";
import { auth } from "../lib/auth.js";

const contactTypes = ["customer", "vendor", "both"];

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function contactScope(organizationId, id) {
  return and(eq(contact.organizationId, organizationId), eq(contact.id, id));
}

async function emailConflict(organizationId, email, excludedId) {
  if (!email) return false;
  const conditions = [
    eq(contact.organizationId, organizationId),
    ilike(contact.email, email),
  ];
  if (excludedId) conditions.push(ne(contact.id, excludedId));
  const [existing] = await db
    .select({ id: contact.id })
    .from(contact)
    .where(and(...conditions))
    .limit(1);
  return Boolean(existing);
}

export async function createContact(req, res, next) {
  try {
    const { password = "12345678", ...contactData } = req.validatedBody;
    const values = {
      ...contactData,
      email: normalizeEmail(contactData.email),
      id: `contact_${randomUUID()}`,
      organizationId: req.organizationId,
    };
    if (await emailConflict(req.organizationId, values.email)) {
      return res
        .status(409)
        .json({
          error: "Email already exists in this organization",
          field: "email",
        });
    }

    // Always create a portal user account for this contact
    try {
      const newUser = await auth.api.createUser({
        body: {
          email: values.email,
          password,
          name: values.name,
          role: "contact",
        },
      });
      if (newUser?.user?.id) {
        values.userId = newUser.user.id;
      }
    } catch (userError) {
      console.error("Failed to create user for contact:", userError);
      return res.status(400).json({
        error:
          userError.message ||
          "Failed to create user account. The email may already be in use.",
        field: "email",
      });
    }

    const [created] = await db.insert(contact).values(values).returning();
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

export async function listContacts(req, res, next) {
  try {
    const filters = [eq(contact.organizationId, req.organizationId)];
    if (req.query.includeArchived !== "true")
      filters.push(eq(contact.isArchived, false));
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = `%${req.query.search.trim()}%`;
      filters.push(
        or(
          ilike(contact.name, search),
          ilike(contact.email, search),
          ilike(contact.mobile, search),
        ),
      );
    }
    const contacts = await db
      .select()
      .from(contact)
      .where(and(...filters))
      .orderBy(asc(contact.name));
    if (req.query.view === "kanban") {
      return res.json({
        view: "kanban",
        groups: contactTypes.map((type) => ({
          type,
          contacts: contacts.filter((item) => item.type === type),
        })),
      });
    }
    return res.json({ view: "list", contacts });
  } catch (error) {
    return next(error);
  }
}

export async function getContact(req, res, next) {
  try {
    const [result] = await db
      .select()
      .from(contact)
      .where(contactScope(req.organizationId, req.params.id))
      .limit(1);
    if (!result) return res.status(404).json({ error: "Contact not found" });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateContact(req, res, next) {
  try {
    const values = { ...req.validatedBody };
    if (Object.hasOwn(values, "email"))
      values.email = normalizeEmail(values.email);
    if (await emailConflict(req.organizationId, values.email, req.params.id)) {
      return res
        .status(409)
        .json({
          error: "Email already exists in this organization",
          field: "email",
        });
    }
    const [updated] = await db
      .update(contact)
      .set(values)
      .where(contactScope(req.organizationId, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Contact not found" });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function setArchived(req, res, next, isArchived) {
  try {
    const [updated] = await db
      .update(contact)
      .set({ isArchived })
      .where(contactScope(req.organizationId, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Contact not found" });

    // When archiving a contact, ban their linked portal user; unban when restoring
    if (updated.userId) {
      if (isArchived) {
        try {
          await auth.api.banUser({
            body: {
              userId: updated.userId,
              banReason: "Contact archived",
            },
            headers: req.headers,
          });
        } catch (err) {
          console.error("Failed to ban linked user via auth.api.banUser:", err);
          await db
            .update(user)
            .set({ banned: true, banReason: "Contact archived" })
            .where(eq(user.id, updated.userId));
        }
      } else {
        try {
          await auth.api.unbanUser({
            body: {
              userId: updated.userId,
            },
            headers: req.headers,
          });
        } catch (err) {
          console.error("Failed to unban linked user via auth.api.unbanUser:", err);
          await db
            .update(user)
            .set({ banned: false, banReason: null, banExpires: null })
            .where(eq(user.id, updated.userId));
        }
      }
    }

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export function archiveContact(req, res, next) {
  return setArchived(req, res, next, true);
}

export function unarchiveContact(req, res, next) {
  return setArchived(req, res, next, false);
}
