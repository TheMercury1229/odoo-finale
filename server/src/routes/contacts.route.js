import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createContactSchema,
  updateContactSchema,
} from "../validators/contacts.js";
import {
  archiveContact,
  createContact,
  getContact,
  getPublicInvitation,
  inviteContact,
  linkContactUser,
  listContacts,
  unarchiveContact,
  updateContact,
} from "../controllers/contacts.js";

const router = express.Router();
const canViewContacts = requirePermission("contact", "view");
const canCreateContacts = requirePermission("contact", "create");
const canUpdateContacts = requirePermission("contact", "update");
const canArchiveContacts = requirePermission("contact", "archive");

// User linking bridge endpoint (authenticated via Better Auth session)
router.post("/link-user", linkContactUser);

// Public invitation lookup endpoint (unauthenticated, for invite acceptance page)
router.get("/public-invitation", getPublicInvitation);

router.post(
  "/",
  canCreateContacts,
  validateBody(createContactSchema),
  createContact,
);
router.get("/", canViewContacts, listContacts);
router.get("/:id", canViewContacts, getContact);
router.patch(
  "/:id",
  canUpdateContacts,
  validateBody(updateContactSchema),
  updateContact,
);
router.post("/:id/invite", canUpdateContacts, inviteContact);
router.patch("/:id/archive", canArchiveContacts, archiveContact);
router.patch("/:id/unarchive", canArchiveContacts, unarchiveContact);

export default router;
