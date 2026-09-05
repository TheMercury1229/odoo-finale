import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
} from "../validators/sales-orders.js";
import {
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  getSalesOrder,
  listSalesOrders,
  updateSalesOrder,
} from "../controllers/sales-orders.js";

const router = express.Router();
const canViewTransactions = requirePermission("transaction", "view");
const canCreateTransactions = requirePermission("transaction", "create");
const canUpdateTransactions = requirePermission("transaction", "update");
const canConfirmTransactions = requirePermission("transaction", "confirm");
const canCancelTransactions = requirePermission("transaction", "cancel");

router.post(
  "/",
  canCreateTransactions,
  validateBody(createSalesOrderSchema),
  createSalesOrder,
);
router.get("/", canViewTransactions, listSalesOrders);
router.get("/:id", canViewTransactions, getSalesOrder);
router.patch(
  "/:id",
  canUpdateTransactions,
  validateBody(updateSalesOrderSchema),
  updateSalesOrder,
);
router.patch("/:id/confirm", canConfirmTransactions, confirmSalesOrder);
router.patch("/:id/cancel", canCancelTransactions, cancelSalesOrder);

export default router;
