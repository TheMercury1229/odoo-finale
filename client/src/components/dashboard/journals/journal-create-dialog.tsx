"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { fetchAccounts } from "@/components/dashboard/chart-of-accounts/chart-of-accounts-api";
import {
  type CreateJournalPayload,
  type JournalType,
  createJournal,
  journalTypeLabels,
} from "@/components/dashboard/journals/journals-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const journalFormSchema = z.object({
  name: z.string().trim().min(1, "Journal name is required."),
  type: z.enum(["sales", "purchase", "bank", "cash"], {
    message: "Select a journal type.",
  }),
  defaultAccountId: z.string().optional(),
});

type JournalFormValues = z.infer<typeof journalFormSchema>;

interface JournalCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalCreateDialog({
  open,
  onOpenChange,
}: JournalCreateDialogProps) {
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => fetchAccounts({ includeArchived: false }),
    enabled: open,
  });

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      name: "",
      type: "sales",
      defaultAccountId: "none",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateJournalPayload) => createJournal(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast.add({
        type: "success",
        title: "Journal created",
        description: `Journal "${created.name}" created successfully.`,
      });
      form.reset({
        name: "",
        type: "sales",
        defaultAccountId: "none",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data?.field) {
        const field = error.response.data.field as keyof JournalFormValues;
        form.setError(field, {
          type: "server",
          message: error.response.data.error,
        });
        return;
      }
      toast.add({
        type: "error",
        title: "Unable to create journal",
        description:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "Please check all fields and try again.",
      });
    },
  });

  function onSubmit(values: JournalFormValues) {
    const payload: CreateJournalPayload = {
      name: values.name.trim(),
      type: values.type,
      defaultAccountId:
        values.defaultAccountId && values.defaultAccountId !== "none"
          ? values.defaultAccountId
          : null,
    };
    mutation.mutate(payload);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          form.reset();
        }
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Journal</DialogTitle>
          <DialogDescription>
            Create a journal for recording transactions. Each type can only exist
            once per organization.
          </DialogDescription>
        </DialogHeader>

        <form
          id="journal-create-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-2"
        >
          <FieldGroup className="space-y-4">
            {/* Journal Name */}
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="journal-name">
                Journal Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="journal-name"
                placeholder="e.g. Sales Journal, Customer Invoices"
                {...form.register("name")}
                aria-invalid={!!form.formState.errors.name}
                autoFocus
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            {/* Journal Type */}
            <Field data-invalid={!!form.formState.errors.type}>
              <FieldLabel htmlFor="journal-type">
                Journal Type <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as JournalType)}
                  >
                    <SelectTrigger id="journal-type" className="w-full">
                      <SelectValue placeholder="Select a journal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">
                        {journalTypeLabels.sales}
                      </SelectItem>
                      <SelectItem value="purchase">
                        {journalTypeLabels.purchase}
                      </SelectItem>
                      <SelectItem value="bank">
                        {journalTypeLabels.bank}
                      </SelectItem>
                      <SelectItem value="cash">
                        {journalTypeLabels.cash}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.type]} />
            </Field>

            {/* Default Account */}
            <Field data-invalid={!!form.formState.errors.defaultAccountId}>
              <FieldLabel htmlFor="journal-default-account">
                Default Account (Optional)
              </FieldLabel>
              <Controller
                control={form.control}
                name="defaultAccountId"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="journal-default-account"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select an account (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="none">
                        — None (No Default Account) —
                      </SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.defaultAccountId]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="journal-create-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create Journal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
