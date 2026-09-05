import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createBudgetSchema = z
  .object({
    name: z
      .string({ required_error: "name is required" })
      .trim()
      .min(1, "name is required"),
    periodStart: z
      .string({ required_error: "periodStart is required" })
      .trim()
      .regex(dateRegex, "periodStart must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid periodStart date"),
    periodEnd: z
      .string({ required_error: "periodEnd is required" })
      .trim()
      .regex(dateRegex, "periodEnd must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid periodEnd date"),
    responsibleContactId: z
      .string({ required_error: "responsibleContactId is required" })
      .trim()
      .min(1, "responsibleContactId is required"),
    analyticAccountId: z
      .string({ required_error: "analyticAccountId is required" })
      .trim()
      .min(1, "analyticAccountId is required"),
    committedAmount: z.coerce
      .number({ required_error: "committedAmount is required" })
      .positive("committedAmount must be greater than 0"),
  })
  .strict()
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "periodEnd must be greater than or equal to periodStart",
    path: ["periodEnd"],
  });

export const updateBudgetSchema = z
  .object({
    name: z.string().trim().min(1, "name cannot be empty").optional(),
    periodStart: z
      .string()
      .trim()
      .regex(dateRegex, "periodStart must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid periodStart date")
      .optional(),
    periodEnd: z
      .string()
      .trim()
      .regex(dateRegex, "periodEnd must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid periodEnd date")
      .optional(),
    responsibleContactId: z
      .string()
      .trim()
      .min(1, "responsibleContactId cannot be empty")
      .optional(),
    analyticAccountId: z
      .string()
      .trim()
      .min(1, "analyticAccountId cannot be empty")
      .optional(),
    committedAmount: z.coerce
      .number()
      .positive("committedAmount must be greater than 0")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  })
  .refine(
    (data) => {
      if (data.periodStart && data.periodEnd) {
        return data.periodEnd >= data.periodStart;
      }
      return true;
    },
    {
      message: "periodEnd must be greater than or equal to periodStart",
      path: ["periodEnd"],
    },
  );

export const reviseBudgetSchema = z
  .object({
    committedAmount: z.coerce
      .number({ required_error: "committedAmount is required" })
      .positive("committedAmount must be greater than 0"),
  })
  .strict();
