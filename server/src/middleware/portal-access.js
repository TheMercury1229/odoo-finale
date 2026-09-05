import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";
import db from "../config/db.js";
import { contact } from "../db/schema.js";
import { auth } from "../lib/auth.js";

/**
 * Middleware: requirePortalAccess
 * Scopes route access strictly to authenticated users with the "contact" role
 * who have an active organization and a linked contact record.
 */
export async function requirePortalAccess(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = session.session?.activeOrganizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "Active organization required" });
    }

    // Role check: explicit check for "contact" role
    const role = session.user?.role;
    if (role !== "contact") {
      return res.status(403).json({ error: "Access restricted to contact users" });
    }

    const userId = session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User session invalid" });
    }

    // Look up the contact row linked to this user and organization
    const [contactRow] = await db
      .select()
      .from(contact)
      .where(
        and(
          eq(contact.userId, userId),
          eq(contact.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!contactRow) {
      return res
        .status(403)
        .json({ error: "No contact record linked to this user" });
    }

    req.session = session;
    req.organizationId = organizationId;
    req.contact = contactRow;
    return next();
  } catch (error) {
    return next(error);
  }
}
