import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createPaymentSchema } from "../validators/payments.js";
import { listPayments, recordPayment } from "../controllers/payments.js";

const router = express.Router();
const canViewTransactions = requirePermission("transaction", "view");
const canRecordPayment = requirePermission("transaction", "record_payment");

router.post(
  "/",
  canRecordPayment,
  validateBody(createPaymentSchema),
  recordPayment,
);
router.get("/", canViewTransactions, listPayments);

export default router;
