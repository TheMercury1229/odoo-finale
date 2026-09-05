import { z } from "zod";

export const salesOrderLineSchema = z
  .object({
    productId: z
      .string({ error: "productId is required" })
      .trim()
      .min(1, "productId is required"),
    quantity: z
      .number({ error: "quantity is required" })
      .gt(0, "Quantity must be greater than 0"),
    unitPrice: z
      .number({ error: "unitPrice is required" })
      .min(0, "Unit price cannot be negative"),
    taxAmount: z
      .number({ error: "taxAmount must be a number" })
      .min(0, "taxAmount cannot be negative")
      .default(0)
      .optional(),
  })
  .strict();

export const createSalesOrderSchema = z
  .object({
    customerId: z
      .string({ error: "customerId is required" })
      .trim()
      .min(1, "customerId is required"),
    orderDate: z
      .string({ error: "orderDate is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "orderDate must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid orderDate"),
    lines: z
      .array(salesOrderLineSchema, { error: "lines is required" })
      .min(1, "Sales order must have at least 1 line"),
  })
  .strict();

export const updateSalesOrderSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .min(1, "customerId cannot be empty")
      .optional(),
    orderDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "orderDate must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid orderDate")
      .optional(),
    lines: z
      .array(salesOrderLineSchema)
      .min(1, "Sales order must have at least 1 line")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });
