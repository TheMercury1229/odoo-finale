"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { fetchAccounts } from "@/components/dashboard/chart-of-accounts/chart-of-accounts-api";
import { fetchJournals } from "@/components/dashboard/journals/journals-api";
import { fetchContacts } from "@/components/dashboard/contacts/contacts-api";
import { createJournalEntry } from "./journal-entries-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const lineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  contactId: z.string().nullable().optional(),
  debit: z.number().min(0, "Debit cannot be negative"),
  credit: z.number().min(0, "Credit cannot be negative"),
});

const createJournalEntrySchema = z.object({
  date: z
    .string()
    .min(1, "Accounting date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  journalId: z.string().min(1, "Journal selection is required"),
  lines: z
    .array(lineSchema)
    .min(2, "Journal entry must have at least 2 lines"),
});

type FormValues = z.infer<typeof createJournalEntrySchema>;

export function JournalEntryCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  // Default to today's date
  const today = new Date().toISOString().split("T")[0];

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createJournalEntrySchema) as any,
    defaultValues: {
      date: today,
      journalId: "",
      lines: [
        { accountId: "", contactId: null, debit: 0, credit: 0 },
        { accountId: "", contactId: null, debit: 0, credit: 0 },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // Query lookups
  const { data: journals = [], isLoading: isLoadingJournals } = useQuery({
    queryKey: ["journals"],
    queryFn: fetchJournals,
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["chart-of-accounts", "unarchived"],
    queryFn: () => fetchAccounts({ includeArchived: false }),
  });

  const { data: contactsResult, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", "unarchived"],
    queryFn: () => fetchContacts({ includeArchived: false, view: "list" }),
  });
  const contacts =
    contactsResult && "contacts" in contactsResult ? contactsResult.contacts : [];

  const unarchivedAccounts = useMemo(
    () => accounts.filter((acc) => !acc.isArchived),
    [accounts],
  );

  const unarchivedContacts = useMemo(
    () => contacts.filter((c) => !c.isArchived),
    [contacts],
  );

  // Live balancing calculation
  const watchedLines = watch("lines") || [];
  const totalDebit = watchedLines.reduce((sum, line) => {
    const val = Number(line?.debit);
    return sum + (Number.isNaN(val) ? 0 : val);
  }, 0);

  const totalCredit = watchedLines.reduce((sum, line) => {
    const val = Number(line?.credit);
    return sum + (Number.isNaN(val) ? 0 : val);
  }, 0);

  // Compare in cents to avoid IEEE 754 floating point issues
  const totalDebitCents = Math.round(totalDebit * 100);
  const totalCreditCents = Math.round(totalCredit * 100);
  const isBalanced = totalDebitCents === totalCreditCents && totalDebitCents > 0;
  const difference = Math.abs(totalDebitCents - totalCreditCents) / 100;

  async function onSubmit(data: FormValues) {
    if (!isBalanced || isSubmitting) return;
    setApiError(null);

    try {
      await createJournalEntry({
        date: data.date,
        journalId: data.journalId,
        lines: data.lines.map((l) => ({
          accountId: l.accountId,
          contactId: l.contactId || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      router.push("/journal-entries");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to post journal entry. Please review inputs.";
      setApiError(msg);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-1 sm:p-4">
      {/* ─── Top Bar: "Post" on left, "Cancel" and "Back" on right (per mockup) ─── */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!isBalanced || isSubmitting}
          className=" rounded-lg px-5 py-2 font-semibold shadow-sm transition-all hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/journal-entries")}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
        </div>
      </div>

      {/* ─── Inline API Error Alert ─── */}
      {apiError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm font-medium">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-destructive/70 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ─── Main Form Container ─── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-6 flex flex-col gap-6">
            {/* ─── Header Fields: Accounting Date & Journal (per mockup) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2 border-b border-border/60">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date" className="font-semibold text-foreground">
                  Accounting Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date")}
                  className="w-full"
                />
                {errors.date && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="journalId" className="font-semibold text-foreground">
                  Journal <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="journalId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="journalId" className="w-full">
                        <SelectValue placeholder="Select a journal" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {isLoadingJournals ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            Loading journals...
                          </div>
                        ) : journals.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No journals found. Create one first.
                          </div>
                        ) : (
                          journals.map((j) => (
                            <SelectItem key={j.id} value={j.id}>
                              {j.name} ({j.type})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.journalId && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.journalId.message}
                  </p>
                )}
              </div>
            </div>

            {/* ─── Line Items Table (Account, Partner, Debit, Credit) ─── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">
                  Journal Items
                </span>
                <span className="text-xs text-muted-foreground">
                  Minimum 2 lines required
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold text-foreground w-[32%]">
                        Account <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground w-[28%]">
                        Partner
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-right w-[18%]">
                        Debit
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-right w-[18%]">
                        Credit
                      </TableHead>
                      <TableHead className="w-[4%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((fieldItem, index) => (
                      <TableRow key={fieldItem.id} className="hover:bg-muted/20">
                        {/* Account Select */}
                        <TableCell className="align-top py-2">
                          <Controller
                            control={control}
                            name={`lines.${index}.accountId`}
                            render={({ field }) => (
                              <Select
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {isLoadingAccounts ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                      Loading accounts...
                                    </div>
                                  ) : (
                                    unarchivedAccounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.type})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.lines?.[index]?.accountId && (
                            <p className="text-[11px] text-destructive mt-1 font-medium">
                              {errors.lines[index]?.accountId?.message}
                            </p>
                          )}
                        </TableCell>

                        {/* Partner Select (Optional) */}
                        <TableCell className="align-top py-2">
                          <Controller
                            control={control}
                            name={`lines.${index}.contactId`}
                            render={({ field }) => (
                              <Select
                                value={field.value || "none"}
                                onValueChange={(val) =>
                                  field.onChange(val === "none" ? null : val)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select partner (optional)" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  <SelectItem value="none">
                                    — None (Optional) —
                                  </SelectItem>
                                  {isLoadingContacts ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                      Loading contacts...
                                    </div>
                                  ) : (
                                    unarchivedContacts.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.type ? `(${c.type})` : ""}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>

                        {/* Debit Input */}
                        <TableCell className="align-top py-2">
                          <Controller
                            control={control}
                            name={`lines.${index}.debit`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="text-right font-mono"
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === "" ? 0 : parseFloat(raw);
                                  field.onChange(Number.isNaN(val) ? 0 : val);
                                  if (val > 0) {
                                    setValue(`lines.${index}.credit`, 0, {
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                              />
                            )}
                          />
                        </TableCell>

                        {/* Credit Input */}
                        <TableCell className="align-top py-2">
                          <Controller
                            control={control}
                            name={`lines.${index}.credit`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="text-right font-mono"
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === "" ? 0 : parseFloat(raw);
                                  field.onChange(Number.isNaN(val) ? 0 : val);
                                  if (val > 0) {
                                    setValue(`lines.${index}.debit`, 0, {
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                              />
                            )}
                          />
                        </TableCell>

                        {/* Row Remove Button */}
                        <TableCell className="align-top py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={fields.length <= 2}
                            onClick={() => remove(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 size-8 p-0"
                            title={
                              fields.length <= 2
                                ? "Minimum 2 lines required"
                                : "Remove line"
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Add Line Button */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      accountId: "",
                      contactId: null,
                      debit: 0,
                      credit: 0,
                    })
                  }
                  className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Plus className="size-4" />
                  Add line
                </Button>
              </div>
            </div>

            {/* ─── Live Totals & Blocking Warning (per mockup) ─── */}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4 font-medium text-sm">
                <div>
                  <span className="text-muted-foreground mr-2">Total Debit:</span>
                  <span className="font-mono font-bold text-foreground">
                    Rs.{" "}
                    {totalDebit.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">Total Credit:</span>
                  <span className="font-mono font-bold text-foreground">
                    Rs.{" "}
                    {totalCredit.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">Difference:</span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      isBalanced
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    Rs.{" "}
                    {difference.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Blocking Warning Alert */}
              {!isBalanced && (
                <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-sm">
                  <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">
                      Blocking warning if the debit and credit amount don't match:{" "}
                    </span>
                    {totalDebitCents === 0 && totalCreditCents === 0 ? (
                      <span>
                        Enter debit and credit amounts. Both totals must be greater than zero.
                      </span>
                    ) : (
                      <span>
                        Debit and credit totals do not match. Debit sum is Rs.{" "}
                        {totalDebit.toFixed(2)}, Credit sum is Rs.{" "}
                        {totalCredit.toFixed(2)} (Difference: Rs.{" "}
                        {difference.toFixed(2)}). You cannot post until both sides are equal.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isBalanced && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Debits and credits are balanced (Rs. {totalDebit.toFixed(2)}). Entry is ready to post.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </form>
    </div>
  );
}
