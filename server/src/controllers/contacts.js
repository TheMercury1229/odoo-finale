import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import db from "../config/db.js";
import { contact, invitation, organization, user } from "../db/schema.js";
import { auth } from "../lib/auth.js";

const contactTypes = ["customer", "vendor", "both"];

function normalizeEmail(email) {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
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
    const { password, ...contactData } = req.validatedBody;
    const values = {
      ...contactData,
      email: normalizeEmail(contactData.email),
      id: `contact_${randomUUID()}`,
      organizationId: req.organizationId,
      // userId is left null until the user accepts the invitation and sets a password
      userId: null,
    };

    if (await emailConflict(req.organizationId, values.email)) {
      return res.status(409).json({
        error: "Email already exists in this organization",
        field: "email",
      });
    }

    // Insert the contact master data record first
    const [created] = await db.insert(contact).values(values).returning();

    // Trigger Better Auth's organization invitation flow if email is provided
    if (values.email) {
      try {
        await auth.api.createInvitation({
          body: {
            email: values.email,
            role: "contact",
            organizationId: req.organizationId,
          },
          headers: fromNodeHeaders(req.headers),
        });
      } catch (inviteError) {
        console.error("Failed to create invitation for contact:", inviteError);
        // Note: Contact business record was created; admin can resend invite via UI
      }
    }

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

    // Fetch pending invitations to enrich portalStatus for all contacts
    const pendingInvitations = await db
      .select({ email: invitation.email, id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, req.organizationId),
          eq(invitation.status, "pending"),
        ),
      );

    const pendingEmailMap = new Map();
    for (const inv of pendingInvitations) {
      if (inv.email) {
        pendingEmailMap.set(inv.email.trim().toLowerCase(), inv.id);
      }
    }

    const enrichedContacts = contacts.map((c) => {
      let portalStatus = c.userId ? "active" : "not_invited";
      let pendingInvitationId = null;

      if (!c.userId && c.email) {
        const inviteId = pendingEmailMap.get(c.email.trim().toLowerCase());
        if (inviteId) {
          portalStatus = "pending";
          pendingInvitationId = inviteId;
        }
      }

      return {
        ...c,
        portalStatus,
        pendingInvitationId,
      };
    });

    if (req.query.view === "kanban") {
      return res.json({
        view: "kanban",
        groups: contactTypes.map((type) => ({
          type,
          contacts: enrichedContacts.filter((item) => item.type === type),
        })),
      });
    }
    return res.json({ view: "list", contacts: enrichedContacts });
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

    // Derive portal status: "active" | "pending" | "not_invited"
    let portalStatus = result.userId ? "active" : "not_invited";
    let pendingInvitationId = null;

    if (!result.userId && result.email) {
      const [pendingInvite] = await db
        .select({ id: invitation.id })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, req.organizationId),
            ilike(invitation.email, result.email),
            eq(invitation.status, "pending"),
          ),
        )
        .limit(1);

      if (pendingInvite) {
        portalStatus = "pending";
        pendingInvitationId = pendingInvite.id;
      }
    }

    return res.json({
      ...result,
      portalStatus,
      pendingInvitationId,
    });
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
      return res.status(409).json({
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
            headers: fromNodeHeaders(req.headers),
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
            headers: fromNodeHeaders(req.headers),
          });
        } catch (err) {
          console.error(
            "Failed to unban linked user via auth.api.unbanUser:",
            err,
          );
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

/**
 * POST /api/contacts/:id/invite
 * Sends or resends an organization portal invitation to the contact's email.
 */
export async function inviteContact(req, res, next) {
  try {
    const [targetContact] = await db
      .select()
      .from(contact)
      .where(contactScope(req.organizationId, req.params.id))
      .limit(1);

    if (!targetContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (targetContact.userId) {
      return res.status(400).json({
        error: "Portal access is already active for this contact.",
      });
    }

    if (!targetContact.email) {
      return res.status(400).json({
        error: "Contact must have an email address to receive an invitation.",
      });
    }

    const invitationResult = await auth.api.createInvitation({
      body: {
        email: targetContact.email,
        role: "contact",
        organizationId: req.organizationId,
        resend: true,
      },
      headers: fromNodeHeaders(req.headers),
    });

    return res.json({
      success: true,
      message: `Invitation sent to ${targetContact.email}`,
      invitation: invitationResult,
    });
  } catch (error) {
    console.error("Failed to send contact invitation:", error);
    return next(error);
  }
}

/**
 * POST /api/contacts/link-user
 * Bridges the newly created/signed-in Better Auth user with their matching Contact record.
 * Called by the public /accept-invite page right after acceptInvitation succeeds.
 */
export async function linkContactUser(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Authentication session required" });
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.toLowerCase().trim();
    const organizationId =
      session.session?.activeOrganizationId || "org_urban_furniture";

    if (!userEmail) {
      return res
        .status(400)
        .json({ error: "User email not found in session token" });
    }

    // 1. Look up contact row by matching email (scoped to the org) where userId IS NULL (or already linked to this user)
    const [matchingContact] = await db
      .select()
      .from(contact)
      .where(
        and(
          eq(contact.organizationId, organizationId),
          ilike(contact.email, userEmail),
          or(isNull(contact.userId), eq(contact.userId, userId)),
        ),
      )
      .limit(1);

    if (!matchingContact) {
      return res.status(404).json({
        error:
          "No matching contact record found for this email in the organization.",
      });
    }

    // 2. Set contact.userId to the authenticated user's ID
    await db
      .update(contact)
      .set({ userId, updatedAt: new Date() })
      .where(eq(contact.id, matchingContact.id));

    return res.json({
      success: true,
      contactId: matchingContact.id,
      name: matchingContact.name,
      email: matchingContact.email,
    });
  } catch (error) {
    console.error("Failed to link contact to user:", error);
    return next(error);
  }
}

export async function getPublicInvitation(req, res, next) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing invitation ID" });
    }

    const [inv] = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(eq(invitation.id, id))
      .limit(1);

    if (!inv) {
      return res.status(404).json({
        error: "This invitation link is invalid or does not exist.",
      });
    }

    if (inv.status !== "pending") {
      return res.status(400).json({
        error: `This invitation has already been ${inv.status}. If you already have an account, please sign in.`,
        status: inv.status,
      });
    }

    if (new Date(inv.expiresAt) < new Date()) {
      return res.status(400).json({
        error:
          "This invitation link has expired. Please ask an administrator to send a new invitation.",
        status: "expired",
      });
    }

    return res.json({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      organizationId: inv.organizationId,
      organizationName: inv.organizationName || "Urban Furniture",
      inviterName: inv.inviterName || "Urban Furniture Team",
      inviterEmail: inv.inviterEmail,
    });
  } catch (error) {
    return next(error);
  }
}
