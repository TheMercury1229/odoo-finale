import { z } from "zod";

export const createVendorBillSchema = z.object({
  purchaseOrderId: z.string({
    required_error: "purchaseOrderId is required",
    invalid_type_error: "purchaseOrderId must be a string",
  }).min(1, "purchaseOrderId is required"),
  vendorReference: z.string().nullable().optional(),
  invoiceDate: z.string({
    required_error: "invoiceDate is required",
  }).regex(/^\d{4}-\d{2}-\d{2}$/, "invoiceDate must be in YYYY-MM-DD format"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be in YYYY-MM-DD format").nullable().optional(),
});
