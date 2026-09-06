import { z } from "zod";

const contactType = z.enum(["customer", "vendor", "both"]);
const contactFields = {
  name: z.string().trim().min(1, "Name is required"),
  type: contactType,
  email: z
    .string()
    .trim()
    .email("Email must be valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  mobile: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPincode: z.string().optional(),
  profileImageUrl: z.url("Profile image URL must be valid").optional(),
};

export const createContactSchema = z
  .object({
    ...contactFields,
    // Password is auto-generated server-side if not provided
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .strict();
export const updateContactSchema = z
  .object({
    name: contactFields.name.optional(),
    type: contactFields.type.optional(),
    email: contactFields.email,
    mobile: contactFields.mobile,
    addressCity: contactFields.addressCity,
    addressState: contactFields.addressState,
    addressPincode: contactFields.addressPincode,
    profileImageUrl: contactFields.profileImageUrl,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
export const archiveContactSchema = z.object({}).strict();
