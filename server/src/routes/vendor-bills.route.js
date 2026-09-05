import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createVendorBillSchema } from "../validators/vendor-bills.js";
import {
  createVendorBill,
  getVendorBill,
  listVendorBills,
} from "../controllers/vendor-bills.js";

const router = express.Router();
const canViewTransactions = requirePermission("transaction", "view");
const canCreateTransactions = requirePermission("transaction", "create");

router.post(
  "/",
  canCreateTransactions,
  validateBody(createVendorBillSchema),
  createVendorBill,
);
router.get("/", canViewTransactions, listVendorBills);
router.get("/:id", canViewTransactions, getVendorBill);

export default router;
