import { z } from "zod";

const productType = z.enum(["goods", "service", "combo"]);

const positiveDecimal = z
  .number({ coerce: true })
  .positive("Must be a positive number");

const productFields = {
  name: z.string().trim().min(1, "Name is required"),
  type: productType,
  salesPrice: positiveDecimal,
  costPrice: positiveDecimal,
  category: z.string().trim().optional(),
};

export const createProductSchema = z
  .object({
    ...productFields,
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: productFields.name.optional(),
    type: productFields.type.optional(),
    salesPrice: productFields.salesPrice.optional(),
    costPrice: productFields.costPrice.optional(),
    category: productFields.category,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
