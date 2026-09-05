import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createAnalyticAccountSchema,
  updateAnalyticAccountSchema,
} from "../validators/analytic-accounts.js";
import {
  archiveAnalyticAccount,
  createAnalyticAccount,
  getAnalyticAccount,
  listAnalyticAccounts,
  unarchiveAnalyticAccount,
  updateAnalyticAccount,
} from "../controllers/analytic-accounts.js";
import { listBudgetsForAnalyticAccount } from "../controllers/budgets.js";

const router = express.Router();
const canViewAnalyticAccounts = requirePermission("analyticAccount", "view");
const canCreateAnalyticAccounts = requirePermission("analyticAccount", "create");
const canUpdateAnalyticAccounts = requirePermission("analyticAccount", "update");
const canArchiveAnalyticAccounts = requirePermission("analyticAccount", "archive");

router.get("/", canViewAnalyticAccounts, listAnalyticAccounts);
router.get("/:id", canViewAnalyticAccounts, getAnalyticAccount);
router.get("/:id/budgets", canViewAnalyticAccounts, listBudgetsForAnalyticAccount);
router.post(
  "/",
  canCreateAnalyticAccounts,
  validateBody(createAnalyticAccountSchema),
  createAnalyticAccount,
);
router.patch(
  "/:id",
  canUpdateAnalyticAccounts,
  validateBody(updateAnalyticAccountSchema),
  updateAnalyticAccount,
);
router.patch("/:id/archive", canArchiveAnalyticAccounts, archiveAnalyticAccount);
router.patch(
  "/:id/unarchive",
  canArchiveAnalyticAccounts,
  unarchiveAnalyticAccount,
);

export default router;
