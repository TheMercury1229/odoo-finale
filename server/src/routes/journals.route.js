import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createJournalSchema } from "../validators/journals.js";
import { createJournal, listJournals } from "../controllers/journals.js";
import { listJournalEntries } from "../controllers/journal-entries.js";

const router = express.Router();
const canViewJournals = requirePermission("journal", "view");
const canCreateJournals = requirePermission("journal", "create");

router.get("/", canViewJournals, listJournals);
router.get("/:id/entries", canViewJournals, listJournalEntries);
router.post(
  "/",
  canCreateJournals,
  validateBody(createJournalSchema),
  createJournal,
);

export default router;
