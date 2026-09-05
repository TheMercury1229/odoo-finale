import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(val) {
  if (!DATE_REGEX.test(val)) return false;
  const [year, month, day] = val.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const balanceSheetQuerySchema = z
  .object({
    asOf: z
      .string()
      .trim()
      .refine(isValidCalendarDate, "asOf must be a valid date in YYYY-MM-DD format")
      .optional(),
  });

export const profitLossQuerySchema = z
  .object({
    from: z
      .string()
      .trim()
      .refine(isValidCalendarDate, "from must be a valid date in YYYY-MM-DD format")
      .optional(),
    to: z
      .string()
      .trim()
      .refine(isValidCalendarDate, "to must be a valid date in YYYY-MM-DD format")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "'from' date cannot be after 'to' date",
      path: ["from"],
    },
  );
