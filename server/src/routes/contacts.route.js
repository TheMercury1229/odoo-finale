import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  archiveContactSchema,
  createContactSchema,
  updateContactSchema,
} from "../validators/contacts.js";
import {
  archiveContact,
  createContact,
  getContact,
  listContacts,
  unarchiveContact,
  updateContact,
} from "../controllers/contacts.js";

const router = express.Router();
const canViewContacts = requirePermission("contact", "view");
const canCreateContacts = requirePermission("contact", "create");
const canUpdateContacts = requirePermission("contact", "update");
const canArchiveContacts = requirePermission("contact", "archive");

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
router.patch(
  "/:id/archive",
  canArchiveContacts,
  validateBody(archiveContactSchema),
  archiveContact,
);
router.patch(
  "/:id/unarchive",
  canArchiveContacts,
  validateBody(archiveContactSchema),
  unarchiveContact,
);

export default router;
