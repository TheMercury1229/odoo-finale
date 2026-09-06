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
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Send,
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
  inviteContact,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { toast } from "@/components/ui/toast";

const contactFormSchema = z
  .object({
    name: z.string().trim().min(1, "Contact name is required."),
    inviteToPortal: z.boolean(),
    email: z.string().trim().optional(),
    mobile: z.string().optional(),
    type: z.enum(["customer", "vendor", "both"], {
      message: "Select a contact type.",
    }),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    profileImageUrl: z.string().optional(),
    isEditing: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.inviteToPortal) {
      if (!data.email || data.email.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email is required to invite this contact to the portal.",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Enter a valid email address.",
        });
      }
    } else if (data.email && data.email.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Enter a valid email address.",
        });
      }
    }
  });

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: Contact;
}

function getDefaultValues(contact?: Contact): ContactFormValues {
  const hasPortal = Boolean(
    contact?.userId ||
      contact?.portalStatus === "pending" ||
      (contact?.email && contact.email.trim().length > 0),
  );
  return {
    name: contact?.name || "",
    inviteToPortal: hasPortal,
    email: contact?.email || "",
    mobile: contact?.mobile || "",
    type: contact?.type || "customer",
    city: contact?.addressCity || "",
    state: contact?.addressState || "",
    pincode: contact?.addressPincode || "",
    profileImageUrl: contact?.profileImageUrl || "",
    isEditing: Boolean(contact),
  };
}

function toPayload(values: ContactFormValues): ContactPayload {
  return {
    name: values.name.trim(),
    email: values.inviteToPortal
      ? values.email?.trim() || undefined
      : values.isEditing
        ? null
        : undefined,
    type: values.type,
    mobile: values.mobile?.trim() || undefined,
    addressCity: values.city?.trim() || undefined,
    addressState: values.state?.trim() || undefined,
    addressPincode: values.pincode?.trim() || undefined,
    profileImageUrl: values.profileImageUrl?.trim() || undefined,
  };
}

export function ContactForm({ contact }: ContactFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, canEditMasterData } = useUserPermissions();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const isEditing = Boolean(contact);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: getDefaultValues(contact),
  });

  const watchInvite = form.watch("inviteToPortal");

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
        ? updateContact(contact!.id, toPayload(values))
        : createContact(toPayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.add({
        type: "success",
        title: isEditing ? "Contact updated" : "Contact created",
        description: isEditing
          ? "Contact details have been updated."
          : "Contact created and invitation email dispatched.",
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

  const inviteMutation = useMutation({
    mutationFn: () => inviteContact(contact!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", contact?.id] });
      toast.add({
        type: "success",
        title: "Invitation sent",
        description: data.message || "Invitation email dispatched to contact.",
      });
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Failed to send invitation",
        description:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "Could not send invitation email. Please try again.",
      });
    },
  });

  return (
    <div className="mx-auto flex w-full  flex-col gap-6">
      {/* ─── Top action bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight">
                {isEditing ? contact?.name : "New Contact"}
              </h1>
              {isEditing && (
                <>
                  <Badge
                    variant={contact?.isArchived ? "destructive" : "secondary"}
                    className="text-xs font-normal capitalize"
                  >
                    {contact?.isArchived ? "Archived" : "Active"}
                  </Badge>
                  {contact?.userId ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs font-normal text-emerald-700 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                      Portal access active
                    </Badge>
                  ) : contact?.portalStatus === "pending" ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-normal text-amber-700 dark:text-amber-300"
                    >
                      <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                      Invitation pending
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Not invited
                    </Badge>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? "Update contact information and portal access"
                : "Create a contact and invite them to the customer/vendor portal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing &&
            canEditMasterData &&
            !contact?.userId &&
            !contact?.isArchived &&
            contact?.email && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inviteMutation.mutate()}
              disabled={
                inviteMutation.isPending ||
                saveMutation.isPending ||
                archiveMutation.isPending
              }
            >
              <Send className="size-3.5" />
              {inviteMutation.isPending
                ? "Sending..."
                : contact?.portalStatus === "pending"
                  ? "Resend Invite"
                  : "Invite to Portal"}
            </Button>
          )}

          {isEditing && isAdmin ? (
            <Button
              type="button"
              variant={contact!.isArchived ? "outline" : "destructive"}
              size="sm"
              className="gap-1.5"
              onClick={() => setArchiveOpen(true)}
              disabled={
                saveMutation.isPending ||
                archiveMutation.isPending ||
                inviteMutation.isPending
              }
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
            disabled={
              saveMutation.isPending ||
              archiveMutation.isPending ||
              inviteMutation.isPending
            }
          >
            Cancel
          </Button>

          {canEditMasterData && (
            <Button
              type="submit"
              form="contact-form"
              size="sm"
              className="gap-1.5"
              disabled={
                saveMutation.isPending ||
                archiveMutation.isPending ||
                inviteMutation.isPending
              }
            >
              <Check className="size-4" />
              {saveMutation.isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Contact"}
            </Button>
          )}
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
        className="flex flex-col gap-6"
      >
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
              {/* Name and Inline Avatar Upload */}
              <div className="flex items-start gap-4">
                <Controller
                  control={form.control}
                  name="profileImageUrl"
                  render={({ field }) => (
                    <div className="pt-6">
                      <ContactAvatarUpload
                        name={form.watch("name") || "Contact"}
                        value={field.value}
                        onChange={(url) => field.onChange(url)}
                      />
                    </div>
                  )}
                />
                <div className="flex-1">
                  <Field data-invalid={!!form.formState.errors.name}>
                    <FieldLabel htmlFor="name">
                      Contact / Company Name *
                    </FieldLabel>
                    <Input
                      id="name"
                      placeholder="e.g. Acme Corporation or Jane Doe"
                      {...form.register("name")}
                      aria-invalid={!!form.formState.errors.name}
                    />
                    <FieldError errors={[form.formState.errors.name]} />
                  </Field>
                </div>
              </div>

              {/* Type and Phone */}
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
                          <SelectItem value="both">
                            Both (Customer & Vendor)
                          </SelectItem>
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

              {/* Portal Access & Invitation Switch */}
              <div className="rounded-lg border bg-muted/20 p-4 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-primary" />
                      <span className="text-sm font-medium">
                        Invite to Portal
                      </span>
                      {contact?.userId ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] font-normal text-emerald-700 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                          Active
                        </Badge>
                      ) : contact?.portalStatus === "pending" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] font-normal text-amber-700 dark:text-amber-300"
                        >
                          <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                          Pending
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contact?.userId
                        ? "This contact has an active portal account linked to their user login."
                        : "Enable to invite this contact to access their customer/vendor portal."}
                    </p>
                  </div>

                  <Controller
                    control={form.control}
                    name="inviteToPortal"
                    render={({ field }) => (
                      <Switch
                        id="invite-to-portal-switch"
                        checked={field.value}
                        disabled={Boolean(contact?.userId)}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked && !contact?.userId) {
                            form.setValue("email", "");
                            form.clearErrors("email");
                          }
                        }}
                      />
                    )}
                  />
                </div>

                {/* When switch is clicked (ON), ask for email */}
                {watchInvite && (
                  <div className="mt-4 border-t pt-4">
                    <Field data-invalid={!!form.formState.errors.email}>
                      <FieldLabel
                        htmlFor="email"
                        className="flex items-center gap-1.5"
                      >
                        <Mail className="size-3.5 text-muted-foreground" />
                        Email Address *
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@company.com"
                        disabled={Boolean(contact?.userId)}
                        {...form.register("email")}
                        aria-invalid={!!form.formState.errors.email}
                      />
                      <FieldDescription className="text-xs">
                        {contact?.userId
                          ? "Linked portal user account email."
                          : "An invitation email will be sent to this address to set up their portal access."}
                      </FieldDescription>
                      <FieldError errors={[form.formState.errors.email]} />
                    </Field>
                  </div>
                )}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Card 2: Address & Location */}
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
