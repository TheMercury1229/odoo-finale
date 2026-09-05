import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from "../validators/purchase-orders.js";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
} from "../controllers/purchase-orders.js";

const router = express.Router();
const canViewTransactions = requirePermission("transaction", "view");
const canCreateTransactions = requirePermission("transaction", "create");
const canUpdateTransactions = requirePermission("transaction", "update");
const canConfirmTransactions = requirePermission("transaction", "confirm");
const canCancelTransactions = requirePermission("transaction", "cancel");

router.post(
  "/",
  canCreateTransactions,
  validateBody(createPurchaseOrderSchema),
  createPurchaseOrder,
);
router.get("/", canViewTransactions, listPurchaseOrders);
router.get("/:id", canViewTransactions, getPurchaseOrder);
router.patch(
  "/:id",
  canUpdateTransactions,
  validateBody(updatePurchaseOrderSchema),
  updatePurchaseOrder,
);
router.patch("/:id/confirm", canConfirmTransactions, confirmPurchaseOrder);
router.patch("/:id/cancel", canCancelTransactions, cancelPurchaseOrder);

export default router;
