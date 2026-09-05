import { z } from "zod";

export const accountType = z.enum([
  "asset",
  "liability",
  "income",
  "expense",
  "capital",
]);

export const createAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Account name is required"),
    type: accountType,
  })
  .strict();

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Account name is required").optional(),
    type: accountType.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });
