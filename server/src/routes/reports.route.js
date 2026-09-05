import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateQuery } from "../middleware/validate-query.js";
import {
  balanceSheetQuerySchema,
  profitLossQuerySchema,
} from "../validators/reports.js";
import {
  getBalanceSheet,
  getProfitLoss,
} from "../controllers/reports.js";

const router = express.Router();
const canViewReports = requirePermission("report", "view");

router.get(
  "/balance-sheet",
  canViewReports,
  validateQuery(balanceSheetQuerySchema),
  getBalanceSheet,
);

router.get(
  "/profit-loss",
  canViewReports,
  validateQuery(profitLossQuerySchema),
  getProfitLoss,
);

export default router;
