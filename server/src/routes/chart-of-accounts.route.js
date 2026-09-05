import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createAccountSchema } from "../validators/chart-of-accounts.js";
import {
  archiveAccount,
  createAccount,
  listAccounts,
  unarchiveAccount,
} from "../controllers/chart-of-accounts.js";

const router = express.Router();
const canViewAccounts = requirePermission("chartOfAccounts", "view");
const canCreateAccounts = requirePermission("chartOfAccounts", "create");
const canArchiveAccounts = requirePermission("chartOfAccounts", "archive");

router.get("/", canViewAccounts, listAccounts);
router.post(
  "/",
  canCreateAccounts,
  validateBody(createAccountSchema),
  createAccount,
);
router.patch("/:id/archive", canArchiveAccounts, archiveAccount);
router.patch("/:id/unarchive", canArchiveAccounts, unarchiveAccount);

export default router;
