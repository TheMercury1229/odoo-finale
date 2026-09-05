import { z } from "zod";

export const createCustomerInvoiceSchema = z.object({
  salesOrderId: z
    .string({
      error: "salesOrderId is required",
    })
    .trim()
    .min(1, "salesOrderId is required"),
  invoiceDate: z
    .string({
      error: "invoiceDate is required",
    })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "invoiceDate must be in YYYY-MM-DD format"),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be in YYYY-MM-DD format")
    .nullable()
    .optional(),
});
