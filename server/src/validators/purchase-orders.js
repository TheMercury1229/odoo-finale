import { z } from "zod";

export const purchaseOrderLineSchema = z
  .object({
    productId: z
      .string({ required_error: "productId is required" })
      .trim()
      .min(1, "productId is required"),
    quantity: z
      .number({ required_error: "quantity is required" })
      .gt(0, "Quantity must be greater than 0"),
    unitPrice: z
      .number({ required_error: "unitPrice is required" })
      .min(0, "Unit price cannot be negative"),
  })
  .strict();

export const createPurchaseOrderSchema = z
  .object({
    vendorId: z
      .string({ required_error: "vendorId is required" })
      .trim()
      .min(1, "vendorId is required"),
    orderDate: z
      .string({ required_error: "orderDate is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "orderDate must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid orderDate"),
    lines: z
      .array(purchaseOrderLineSchema, { required_error: "lines is required" })
      .min(1, "Purchase order must have at least 1 line"),
  })
  .strict();

export const updatePurchaseOrderSchema = z
  .object({
    vendorId: z
      .string()
      .trim()
      .min(1, "vendorId cannot be empty")
      .optional(),
    orderDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "orderDate must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid orderDate")
      .optional(),
    lines: z
      .array(purchaseOrderLineSchema)
      .min(1, "Purchase order must have at least 1 line")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });
