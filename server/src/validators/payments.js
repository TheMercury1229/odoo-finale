import { z } from "zod";

export const createPaymentSchema = z.object({
  targetType: z.enum(["vendor_bill", "customer_invoice"], {
    required_error: "targetType is required ('vendor_bill' | 'customer_invoice')",
  }),
  targetId: z.string({
    required_error: "targetId is required",
  }).min(1, "targetId is required"),
  method: z.enum(["cash", "bank"], {
    required_error: "method is required ('cash' | 'bank')",
  }),
  amount: z.coerce
    .number({
      required_error: "amount is required",
      invalid_type_error: "amount must be a number",
    })
    .positive("amount must be greater than zero"),
  date: z.string({
    required_error: "date is required (YYYY-MM-DD)",
  }).regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  note: z.string().nullable().optional(),
});

export const getPaymentsQuerySchema = z.object({
  targetType: z.enum(["vendor_bill", "customer_invoice"], {
    required_error: "targetType is required ('vendor_bill' | 'customer_invoice')",
  }),
  targetId: z.string({
    required_error: "targetId is required",
  }).min(1, "targetId is required"),
});
