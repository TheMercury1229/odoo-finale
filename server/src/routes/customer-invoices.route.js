import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import { createCustomerInvoiceSchema } from "../validators/customer-invoices.js";
import {
  createCustomerInvoice,
  getCustomerInvoice,
  listCustomerInvoices,
} from "../controllers/customer-invoices.js";

const router = express.Router();
const canViewTransactions = requirePermission("transaction", "view");
const canCreateTransactions = requirePermission("transaction", "create");

router.post(
  "/",
  canCreateTransactions,
  validateBody(createCustomerInvoiceSchema),
  createCustomerInvoice,
);
router.get("/", canViewTransactions, listCustomerInvoices);
router.get("/:id", canViewTransactions, getCustomerInvoice);

export default router;
