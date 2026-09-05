import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createBudgetSchema,
  reviseBudgetSchema,
  updateBudgetSchema,
} from "../validators/budgets.js";
import {
  cancelBudget,
  confirmBudget,
  createBudget,
  getBudget,
  getBudgetAchievedDetail,
  listBudgets,
  reviseBudget,
  updateBudget,
} from "../controllers/budgets.js";

const router = express.Router();
const canViewBudgets = requirePermission("budget", "view");
const canCreateBudgets = requirePermission("budget", "create");
const canUpdateBudgets = requirePermission("budget", "update");

router.get("/", canViewBudgets, listBudgets);
router.get("/:id", canViewBudgets, getBudget);
router.get("/:id/achieved-detail", canViewBudgets, getBudgetAchievedDetail);

router.post(
  "/",
  canCreateBudgets,
  validateBody(createBudgetSchema),
  createBudget,
);

router.patch(
  "/:id",
  canUpdateBudgets,
  validateBody(updateBudgetSchema),
  updateBudget,
);

router.patch("/:id/confirm", canUpdateBudgets, confirmBudget);
router.patch("/:id/cancel", canUpdateBudgets, cancelBudget);

router.post(
  "/:id/revise",
  canCreateBudgets,
  validateBody(reviseBudgetSchema),
  reviseBudget,
);

export default router;
