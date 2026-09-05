import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateQuery } from "../middleware/validate-query.js";
import {
  balanceSheetQuerySchema,
  budgetReportQuerySchema,
  profitLossQuerySchema,
} from "../validators/reports.js";
import {
  getBalanceSheet,
  getBudgetReport,
  getProfitLoss,
  getStockReport,
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

router.get(
  "/budget",
  canViewReports,
  validateQuery(budgetReportQuerySchema),
  getBudgetReport,
);

router.get("/stock", canViewReports, getStockReport);

export default router;
