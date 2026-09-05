import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createJournalEntrySchema } from "../validators/journal-entries.js";
import {
  createJournalEntry,
  getJournalEntry,
  listJournalEntries,
} from "../controllers/journal-entries.js";

const router = express.Router();
const canViewJournals = requirePermission("journal", "view");
const canCreateJournals = requirePermission("journal", "create");

router.get("/", canViewJournals, listJournalEntries);
router.get("/:id", canViewJournals, getJournalEntry);
router.post(
  "/",
  canCreateJournals,
  validateBody(createJournalEntrySchema),
  createJournalEntry,
);

export default router;
