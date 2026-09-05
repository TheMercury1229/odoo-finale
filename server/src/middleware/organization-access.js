import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

export function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const organizationId = session.session.activeOrganizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "Active organization required" });
      }

      const permission = await auth.api.hasPermission({
        headers: fromNodeHeaders(req.headers),
        body: {
          organizationId,
          permissions: { [resource]: [action] },
        },
      });

      if (!permission?.success) {
        return res.status(403).json({ error: "Insufficient permission" });
      }

      req.session = session;
      req.organizationId = organizationId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
