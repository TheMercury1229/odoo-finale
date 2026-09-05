import express from "express";
import { requirePortalAccess } from "../middleware/portal-access.js";
import {
  getPortalBill,
  getPortalBills,
  getPortalInvoice,
  getPortalInvoices,
} from "../controllers/portal.js";

const router = express.Router();

// All portal routes require contact portal access
router.use(requirePortalAccess);

router.get("/bills", getPortalBills);
router.get("/bills/:id", getPortalBill);
router.get("/invoices", getPortalInvoices);
router.get("/invoices/:id", getPortalInvoice);

export default router;
