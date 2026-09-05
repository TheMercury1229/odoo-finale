import { z } from "zod";

export const analyticType = z.enum(["income", "expense"]);

export const createAnalyticAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Analytic account name is required"),
    type: analyticType,
  })
  .strict();

export const updateAnalyticAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Analytic account name is required").optional(),
    type: analyticType.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });
