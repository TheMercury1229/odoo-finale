"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type {
  Contact,
  ContactPayload,
  ContactType,
} from "@/components/dashboard/contacts/contacts-api";
import {
  createContact,
  setContactArchived,
  updateContact,
} from "@/components/dashboard/contacts/contacts-api";
import { ContactAvatarUpload } from "@/components/dashboard/contacts/contact-avatar-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth";
import { toast } from "@/components/ui/toast";

const contactFormSchema = z
  .object({
    name: z.string().trim().min(1, "Contact name is required."),
    email: z
      .string()
      .trim()
      .min(1, "Email is required for the contact and portal user account.")
      .email("Enter a valid email address."),
    mobile: z.string().optional(),
    type: z.enum(["customer", "vendor", "both"], {
      message: "Select a contact type.",
    }),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    profileImageUrl: z.string().optional(),
    password: z.string().optional(),
    isEditing: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Password is strictly mandatory when creating a new contact
    if (!data.isEditing) {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required and must be at least 8 characters.",
          path: ["password"],
        });
      }
    }
  });

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: Contact;
}

function getDefaultValues(contact?: Contact): ContactFormValues {
  let street = "";
  let city = contact?.addressCity || "";

  if (contact?.addressCity && contact.addressCity.includes(",")) {
    const lastCommaIndex = contact.addressCity.lastIndexOf(",");
    street = contact.addressCity.substring(0, lastCommaIndex).trim();
    city = contact.addressCity.substring(lastCommaIndex + 1).trim();
  }

  return {
    name: contact?.name || "",
    email: contact?.email || "",
    mobile: contact?.mobile || "",
    type: contact?.type || "customer",
    street,
    city,
    state: contact?.addressState || "",
    pincode: contact?.addressPincode || "",
    profileImageUrl: contact?.profileImageUrl || "",
    password: "",
    isEditing: Boolean(contact),
  };
}

function toPayload(
  values: ContactFormValues,
  isEditing: boolean,
): ContactPayload {
  // Combine street and city cleanly into the backend addressCity column
  const addressCity = [values.street?.trim(), values.city?.trim()]
    .filter(Boolean)
    .join(", ");

  const payload: ContactPayload = {
    name: values.name.trim(),
    email: values.email.trim(),
    type: values.type,
    mobile: values.mobile?.trim() || undefined,
    addressCity: addressCity || undefined,
    addressState: values.state?.trim() || undefined,
    addressPincode: values.pincode?.trim() || undefined,
    profileImageUrl: values.profileImageUrl?.trim() || undefined,
  };

  // Only pass password on creation (update schema has .strict() and doesn't take password)
  if (!isEditing && values.password) {
    payload.password = values.password;
  }

  return payload;
}

export function ContactForm({ contact }: ContactFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = Boolean(contact);
  const isAdmin = session?.user.role === "admin";
  const hasLinkedUser = Boolean(contact?.userId);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: getDefaultValues(contact),
  });

  const prevContactIdRef = useRef<string | undefined>(contact?.id);

  useEffect(() => {
    if (contact && contact.id !== prevContactIdRef.current) {
      prevContactIdRef.current = contact.id;
      form.reset(getDefaultValues(contact));
    }
  }, [contact, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      isEditing
        ? updateContact(contact!.id, toPayload(values, true))
        : createContact(toPayload(values, false)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.add({
        type: "success",
        title: isEditing ? "Contact updated" : "Contact created",
        description: isEditing
          ? "Contact details have been updated."
          : "Contact and portal user account created successfully.",
      });
      router.push("/contacts");
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        form.setError("email", {
          type: "server",
          message: "This email is already in use by another contact or user.",
        });
        return;
      }
      if (axios.isAxiosError(error) && error.response?.data?.field) {
        const field = error.response.data.field as keyof ContactFormValues;
        form.setError(field, {
          type: "server",
          message: error.response.data.error,
        });
        return;
      }
      toast.add({
        type: "error",
        title: "Unable to save contact",
        description:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "Please verify all fields and try again.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => setContactArchived(contact!.id, !contact!.isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", contact?.id] });
      setArchiveOpen(false);
      toast.add({
        type: "success",
        title: contact?.isArchived ? "Contact restored" : "Contact archived",
        description: contact?.isArchived
          ? "Contact restored and portal access unbanned."
          : "Contact archived and portal access banned.",
      });
      router.push("/contacts");
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* ─── Top action bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.back()}
            disabled={saveMutation.isPending || archiveMutation.isPending}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? contact?.name : "New Contact"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? "Update contact information and address"
                : "Create a contact and automatically provision their portal account"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && isAdmin ? (
            <Button
              type="button"
              variant={contact!.isArchived ? "outline" : "destructive"}
              size="sm"
              className="gap-1.5"
              onClick={() => setArchiveOpen(true)}
              disabled={saveMutation.isPending || archiveMutation.isPending}
            >
              {contact!.isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {contact!.isArchived ? "Unarchive" : "Archive"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/contacts")}
            disabled={saveMutation.isPending || archiveMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="contact-form"
            size="sm"
            className="gap-1.5"
            disabled={saveMutation.isPending || archiveMutation.isPending}
          >
            <Check className="size-4" />
            {saveMutation.isPending
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Contact"}
          </Button>
        </div>
      </div>

      {/* ─── Archived banner if archived ─── */}
      {contact?.isArchived ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <Archive className="size-4" />
          <span>
            This contact is currently archived and portal access is banned. It
            will not appear in default selection lists.
          </span>
        </div>
      ) : null}

      {/* ─── Main Form ─── */}
      <form
        id="contact-form"
        onSubmit={form.handleSubmit((values) => {
          if (saveMutation.isPending || archiveMutation.isPending) return;
          saveMutation.mutate(values);
        })}
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
        {/* ─── Left Column: Details ─── */}
        <div className="flex flex-col gap-6">
          {/* Card 1: General Information */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                <CardTitle>General Information</CardTitle>
              </div>
              <CardDescription>
                Basic details and classification for this contact
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="name">Contact / Company Name *</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g. Acme Corporation or Jane Doe"
                    {...form.register("name")}
                    aria-invalid={!!form.formState.errors.name}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.type}>
                    <FieldLabel htmlFor="type">Contact Type *</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as ContactType)
                          }
                        >
                          <SelectTrigger
                            id="type"
                            aria-invalid={!!form.formState.errors.type}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="both">Both (Customer & Vendor)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[form.formState.errors.type]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="mobile" className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" />
                      Phone / Mobile
                    </FieldLabel>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="+91 98765 43210"
                      {...form.register("mobile")}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Card 2: Portal Login Account (MANDATORY) */}
          <Card className="border-primary/20 bg-card">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <CardTitle>Portal Login Account</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {isEditing ? "Role: Contact" : "Mandatory Account"}
                </Badge>
              </div>
              <CardDescription>
                {isEditing
                  ? "Portal credentials and linked user account details."
                  : "A portal user account is automatically created for this contact with the contact role."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.email}>
                    <FieldLabel htmlFor="email" className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground" />
                      Portal Login Email *
                    </FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      {...form.register("email")}
                      aria-invalid={!!form.formState.errors.email}
                    />
                    <FieldDescription className="text-xs">
                      Used as the username to sign into the portal
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.email]} />
                  </Field>

                  {!isEditing ? (
                    <Field data-invalid={!!form.formState.errors.password}>
                      <FieldLabel htmlFor="password">Initial Password *</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 8 characters"
                          {...form.register("password")}
                          aria-invalid={!!form.formState.errors.password}
                        />
                        <InputGroupButton
                          type="button"
                          size="icon-sm"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroup>
                      <FieldDescription className="text-xs">
                        Required: At least 8 characters
                      </FieldDescription>
                      <FieldError errors={[form.formState.errors.password]} />
                    </Field>
                  ) : (
                    <div className="flex flex-col justify-center rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <KeyRound className="size-4 text-muted-foreground" />
                        <span>Portal Account Status</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasLinkedUser
                          ? `Linked User ID: ${contact?.userId}`
                          : "No linked user account found."}
                      </p>
                    </div>
                  )}
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Card 3: Address & Location (According to Backend Schema) */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <CardTitle>Address & Location</CardTitle>
              </div>
              <CardDescription>
                Physical address details stored in the contact master data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="street" className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    Street Address / Area
                  </FieldLabel>
                  <Input
                    id="street"
                    placeholder="Suite 400, 123 Business Avenue, Indiranagar"
                    {...form.register("street")}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input
                      id="city"
                      placeholder="e.g. Bengaluru"
                      {...form.register("city")}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="state">State / Province</FieldLabel>
                    <Input
                      id="state"
                      placeholder="e.g. Karnataka"
                      {...form.register("state")}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pincode">PIN / Postal Code</FieldLabel>
                    <Input
                      id="pincode"
                      placeholder="e.g. 560038"
                      {...form.register("pincode")}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column: Profile Photo & Summary ─── */}
        <div className="flex flex-col gap-6">
          {/* Card: Profile Photo */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Profile Photo</CardTitle>
              <CardDescription>
                Upload an avatar or company logo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Controller
                control={form.control}
                name="profileImageUrl"
                render={({ field }) => (
                  <ContactAvatarUpload
                    name={form.watch("name") || "Contact"}
                    value={field.value}
                    onChange={(url) => field.onChange(url)}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Card: Contact Summary Meta */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Summary & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Type</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {form.watch("type")}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Portal Access</span>
                <Badge
                  variant={isEditing && hasLinkedUser ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isEditing
                    ? hasLinkedUser
                      ? "Active"
                      : "Pending"
                    : "Auto-created"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge
                  variant={contact?.isArchived ? "destructive" : "outline"}
                  className="text-xs"
                >
                  {contact?.isArchived ? "Archived" : "Active"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* ─── Archive Confirmation Dialog ─── */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {contact?.isArchived ? "Unarchive" : "Archive"} contact?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {contact?.isArchived
                ? "This contact will be restored and their portal access will be unbanned."
                : "This contact will be archived, their portal access will be banned, and they will be hidden from transaction pickers. All past financial records remain intact."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (archiveMutation.isPending) return;
                archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
