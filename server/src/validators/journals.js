import { z } from "zod";

export const journalTypeEnum = z.enum(["sales", "purchase", "bank", "cash"], {
  errorMap: () => ({ message: "Type must be one of: sales, purchase, bank, cash" }),
});

export const createJournalSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(1, "Name is required"),
    type: journalTypeEnum,
    defaultAccountId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : val)),
  })
  .strict();
