import { z } from "zod";

const journalEntryLineSchema = z
  .object({
    accountId: z
      .string({ required_error: "accountId is required" })
      .trim()
      .min(1, "accountId is required"),
    contactId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => (val === "" || val === undefined ? null : val)),
    debit: z
      .number({ required_error: "debit is required" })
      .min(0, "Debit must be greater than or equal to 0"),
    credit: z
      .number({ required_error: "credit is required" })
      .min(0, "Credit must be greater than or equal to 0"),
  })
  .strict();

export const createJournalEntrySchema = z
  .object({
    date: z
      .string({ required_error: "date is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date"),
    journalId: z
      .string({ required_error: "journalId is required" })
      .trim()
      .min(1, "journalId is required"),
    lines: z
      .array(journalEntryLineSchema, { required_error: "lines is required" })
      .min(2, "Journal entry must have at least 2 lines"),
  })
  .strict();
