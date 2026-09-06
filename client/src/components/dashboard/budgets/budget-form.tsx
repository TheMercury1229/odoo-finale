"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Layers,
  PiggyBank,
  Plus,
  RefreshCw,
  Save,
  Tag,
  User,
  X,
  XCircle,
} from "lucide-react";
import axios from "axios";

import {
  type Budget,
  type BudgetStatus,
  cancelBudget,
  confirmBudget,
  createBudget,
  fetchBudgetAchievedDetail,
  fetchContactsList,
  reviseBudget,
  updateBudget,
} from "./budgets-api";
import { fetchAnalyticAccounts } from "../analytic-accounts/analytic-accounts-api";
import { formatCurrency } from "../reports/reports-api";
import { BudgetStatusBadge } from "./budgets-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const budgetFormSchema = z
  .object({
    name: z.string().trim().min(1, "Budget name is required"),
    periodStart: z
      .string()
      .trim()
      .min(1, "Start date is required")
      .regex(dateRegex, "Start date must be in YYYY-MM-DD format"),
    periodEnd: z
      .string()
      .trim()
      .min(1, "End date is required")
      .regex(dateRegex, "End date must be in YYYY-MM-DD format"),
    responsibleContactId: z
      .string()
      .trim()
      .min(1, "Responsible contact is required"),
    analyticAccountId: z.string().trim().min(1, "Analytic account is required"),
    committedAmount: z
      .number({ message: "Committed amount is required" })
      .positive("Committed amount must be greater than 0"),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "End date must be greater than or equal to start date",
    path: ["periodEnd"],
  });

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  initialData?: Budget;
}

function formatDateDMY(dateStr?: string | null) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function BudgetForm({ initialData }: BudgetFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(initialData);

  const status: BudgetStatus = initialData?.status || "draft";
  const isDraft = status === "draft";
  const isConfirmed = status === "confirmed";
  const isRevised = status === "revised";
  const isCancelled = status === "cancelled";

  const [serverError, setServerError] = useState<string | null>(null);
  const [showReviseDialog, setShowReviseDialog] = useState(false);
  const [newCommittedAmount, setNewCommittedAmount] = useState<string>(
    initialData?.committedAmount ? String(initialData.committedAmount) : "",
  );
  const [showDrillDown, setShowDrillDown] = useState(false);

  // 1. Fetch analytic accounts (exclude archived)
  const { data: analyticAccounts = [], isLoading: isLoadingAccounts } =
    useQuery({
      queryKey: ["analytic-accounts", false],
      queryFn: () => fetchAnalyticAccounts({ includeArchived: false }),
    });

  // 2. Fetch contacts for responsible person select (matches mockup: Contact, not user)
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: fetchContactsList,
  });

  // 3. Drill-down data query
  const { data: achievedDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["budget-achieved-detail", initialData?.id],
    queryFn: () => fetchBudgetAchievedDetail(initialData!.id),
    enabled: Boolean(initialData?.id && showDrillDown),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      periodStart: initialData?.periodStart || "",
      periodEnd: initialData?.periodEnd || "",
      responsibleContactId: initialData?.responsibleContactId || "",
      analyticAccountId: initialData?.analyticAccountId || "",
      committedAmount: initialData?.committedAmount
        ? Number(initialData.committedAmount)
        : ("" as unknown as number),
    },
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: BudgetFormValues) => {
      if (isEditing && initialData) {
        return updateBudget(initialData.id, values);
      }
      return createBudget(values);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", saved.id] });
      toast.add({
        type: "success",
        title: isEditing
          ? `Budget "${saved.name}" updated successfully`
          : `Budget "${saved.name}" created in draft`,
      });
      router.push(`/budgets/${saved.id}`);
    },
    onError: (err: unknown) => {
      let msg = "An unexpected error occurred.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setServerError(msg);
      toast.add({
        type: "error",
        title: msg,
      });
    },
  });

  // Confirm mutation (draft -> confirmed)
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!initialData) throw new Error("No budget to confirm");
      return confirmBudget(initialData.id);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", initialData?.id] });
      toast.add({
        type: "success",
        title: `Budget "${updated?.name}" is now confirmed!`,
      });
    },
    onError: (err: unknown) => {
      let msg = "Failed to confirm budget.";
      if (axios.isAxiosError(err))
        msg = err.response?.data?.error || err.message;
      toast.add({ type: "error", title: msg });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!initialData) throw new Error("No budget to cancel");
      return cancelBudget(initialData.id);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", initialData?.id] });
      toast.add({
        type: "info",
        title: `Budget "${updated?.name}" cancelled`,
      });
    },
    onError: (err: unknown) => {
      let msg = "Failed to cancel budget.";
      if (axios.isAxiosError(err))
        msg = err.response?.data?.error || err.message;
      toast.add({ type: "error", title: msg });
    },
  });

  // Revise mutation
  const reviseMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!initialData) throw new Error("No budget to revise");
      return reviseBudget(initialData.id, { committedAmount: amount });
    },
    onSuccess: (newRevision) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", initialData?.id] });
      setShowReviseDialog(false);
      toast.add({
        type: "success",
        title: `Budget revised! New budget "${newRevision.name}" created.`,
      });
      router.push(`/budgets/${newRevision.id}`);
    },
    onError: (err: unknown) => {
      let msg = "Failed to revise budget.";
      if (axios.isAxiosError(err))
        msg = err.response?.data?.error || err.message;
      toast.add({ type: "error", title: msg });
    },
  });

  const onSubmit = (values: BudgetFormValues) => {
    setServerError(null);
    saveMutation.mutate(values);
  };

  const handleConfirmRevision = () => {
    const amt = parseFloat(newCommittedAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.add({
        type: "error",
        title: "Please enter a valid committed amount greater than 0",
      });
      return;
    }
    reviseMutation.mutate(amt);
  };

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-6 pb-16">
      {/* ─── Top Bar Actions ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        {/* Left Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* On CREATE form (!isExisting): Only show "Save Draft" */}
          {!isEditing && (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || saveMutation.isPending}
            >
              {isSubmitting || saveMutation.isPending ? (
                <Spinner className="mr-1.5 size-4" />
              ) : (
                <Save className="mr-1.5 size-4" />
              )}
              Save Draft
            </Button>
          )}

          {/* On EDIT/DETAIL form (isExisting): */}
          {/* If status is "draft": show "Save Draft", "Confirm", "Cancel" */}
          {isEditing && isDraft && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || saveMutation.isPending}
              >
                {isSubmitting || saveMutation.isPending ? (
                  <Spinner className="mr-1.5 size-4" />
                ) : (
                  <Save className="mr-1.5 size-4" />
                )}
                Save Draft
              </Button>

              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <Spinner className="mr-1.5 size-4" />
                ) : (
                  <Check className="mr-1.5 size-4" />
                )}
                Confirm
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm("Are you sure you want to cancel this budget?")
                  ) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <X className="mr-1.5 size-4" />
                Cancel
              </Button>
            </>
          )}

          {/* If status is "confirmed": show "Revise" and "Cancel" */}
          {isEditing && isConfirmed && (
            <>
              <Button
                type="button"
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                onClick={() => setShowReviseDialog(true)}
              >
                <RefreshCw className="mr-1.5 size-4" />
                Revise
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm("Are you sure you want to cancel this budget?")
                  ) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <X className="mr-1.5 size-4" />
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Right Navigation / Back */}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/budgets")}
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
        </div>
      </div>

      {/* ─── Inline API Error Alert ─── */}
      {serverError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm font-medium">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-destructive/70 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ─── Main Form Card ─── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {isEditing ? initialData?.name : "New Budget"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing
                ? `Budget Period: ${formatDateDMY(initialData?.periodStart)} – ${formatDateDMY(initialData?.periodEnd)}`
                : "Create a new financial budget"}
            </p>
          </div>
          <div>
            <BudgetStatusBadge status={status} />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Revision Of Link (if this is a revision of an original budget) */}
              {initialData?.revisionOf && (
                <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-sm dark:border-purple-900/50 dark:bg-purple-950/20">
                  <History className="size-4 text-purple-600" />
                  <span className="font-medium text-foreground">
                    Revision Of:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/budgets/${initialData.revisionOf!.id}`)
                    }
                    className="font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                  >
                    {initialData.revisionOf.name}
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Revised With Link (if this budget was revised by a newer budget) */}
              {initialData?.revisions && initialData.revisions.length > 0 && (
                <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm dark:border-blue-900/50 dark:bg-blue-950/20">
                  <RefreshCw className="size-4 text-blue-600" />
                  <span className="font-medium text-foreground">
                    Revised With:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/budgets/${initialData.revisions![0].id}`)
                    }
                    className="font-semibold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    {initialData.revisions[0].name}
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Budget Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="font-semibold text-foreground"
                >
                  Budget Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder='e.g. "January 2026"'
                  disabled={!isDraft}
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Committed Amount */}
              <div className="space-y-2">
                <Label
                  htmlFor="committedAmount"
                  className="font-semibold text-foreground"
                >
                  Committed Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="committedAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={!isDraft}
                  {...register("committedAmount", { valueAsNumber: true })}
                  className={
                    errors.committedAmount ? "border-destructive" : ""
                  }
                />
                {errors.committedAmount && (
                  <p className="text-xs text-destructive">
                    {errors.committedAmount.message}
                  </p>
                )}
              </div>

              {/* Budget Period (Start Date & End Date) */}
              <div className="space-y-2">
                <Label htmlFor="periodStart" className="font-semibold text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="periodStart"
                  type="date"
                  disabled={!isDraft}
                  {...register("periodStart")}
                  className={
                    errors.periodStart ? "border-destructive" : ""
                  }
                />
                {errors.periodStart && (
                  <p className="text-xs text-destructive">
                    {errors.periodStart.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodEnd" className="font-semibold text-foreground">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="periodEnd"
                  type="date"
                  disabled={!isDraft}
                  {...register("periodEnd")}
                  className={errors.periodEnd ? "border-destructive" : ""}
                />
                {errors.periodEnd && (
                  <p className="text-xs text-destructive">
                    {errors.periodEnd.message}
                  </p>
                )}
              </div>

              {/* Responsible Contact - FULL WIDTH */}
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="responsibleContactId"
                  className="font-semibold text-foreground"
                >
                  Responsible Contact <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="responsibleContactId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isDraft || isLoadingContacts}
                    >
                      <SelectTrigger
                        id="responsibleContactId"
                        className={`w-full ${
                          errors.responsibleContactId
                            ? "border-destructive"
                            : ""
                        }`}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingContacts
                              ? "Loading contacts..."
                              : "Select responsible contact"
                          }
                        >
                          {
                            contacts.find(
                              (contact) => contact.id === field.value,
                            )?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.email ? `(${c.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.responsibleContactId && (
                  <p className="text-xs text-destructive">
                    {errors.responsibleContactId.message}
                  </p>
                )}
              </div>

              {/* Analytic Account - FULL WIDTH */}
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="analyticAccountId"
                  className="font-semibold text-foreground"
                >
                  Analytic Account <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="analyticAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isDraft || isLoadingAccounts}
                    >
                      <SelectTrigger
                        id="analyticAccountId"
                        className={`w-full ${
                          errors.analyticAccountId ? "border-destructive" : ""
                        }`}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingAccounts
                              ? "Loading analytic accounts..."
                              : "Select analytic account"
                          }
                        >
                          {
                            analyticAccounts.find(
                              (account) => account.id === field.value,
                            )?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {analyticAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} (
                            {a.type === "income" ? "Income" : "Expense"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.analyticAccountId && (
                  <p className="text-xs text-destructive">
                    {errors.analyticAccountId.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Analytic Line Table (ONLY Visible for Confirmed/Revised Budget per mockup) ─── */}
      {isEditing && (isConfirmed || isRevised) && (
        <Card className="overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 border-b pb-3 pt-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Budget Performance Lines
            </CardTitle>
            <CardDescription>
              Real-time invoice and bill lines tagged with this analytic account
              within the budget period.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>Analytic</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Committed Amount</TableHead>
                <TableHead className="text-right">Achieved Amount</TableHead>
                <TableHead className="text-right">Achieved %</TableHead>
                <TableHead className="text-right">Amount To Achieve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-foreground">
                  {initialData?.analyticAccountName || "—"}
                </TableCell>
                <TableCell className="capitalize">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      initialData?.analyticAccountType === "income"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {initialData?.analyticAccountType || "Expense"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(initialData?.committedAmount) || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {/* Clickable Achieved Amount button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDrillDown(true)}
                    className="h-8 gap-1.5 font-bold text-primary hover:text-primary hover:bg-primary/10"
                    title="Click to view contributing invoices/bills"
                  >
                    <span>
                      {formatCurrency(Number(initialData?.achievedAmount) || 0)}
                    </span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </Button>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className="rounded-md bg-muted px-2 py-1 font-semibold text-foreground">
                    {initialData?.achievedPercent != null
                      ? `${initialData.achievedPercent}%`
                      : "0%"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {formatCurrency(Number(initialData?.amountToAchieve) || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Revise Dialog ─── */}
      <Dialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="size-5 text-purple-600" />
              Revise Budget — {initialData?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the new committed amount. The current budget will move to{" "}
              <strong>Revised</strong>, and a new revision budget will be
              created in <strong>Confirmed</strong> status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="reviseAmount" className="text-sm font-semibold">
                New Committed Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reviseAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newCommittedAmount}
                onChange={(e) => setNewCommittedAmount(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Original amount was{" "}
                {formatCurrency(Number(initialData?.committedAmount) || 0)}.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReviseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRevision}
              disabled={reviseMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {reviseMutation.isPending && <Spinner className="size-4" />}
              Confirm Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Achieved Amount Drill-Down Dialog ─── */}
      <Dialog open={showDrillDown} onOpenChange={setShowDrillDown}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-primary" />
              Achieved Amount Drill-Down
            </DialogTitle>
            <DialogDescription>
              {initialData?.analyticAccountType === "income"
                ? "Customer Invoices"
                : "Vendor Bills"}{" "}
              tagged with <strong>{initialData?.analyticAccountName}</strong>{" "}
              between {formatDateDMY(initialData?.periodStart)} and{" "}
              {formatDateDMY(initialData?.periodEnd)}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {isLoadingDetail ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <Spinner className="size-6 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Loading lines...
                </p>
              </div>
            ) : !achievedDetail?.items || achievedDetail.items.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FileText className="size-8 opacity-40" />
                <p className="text-sm">
                  No invoices or bills have been posted with this analytic tag
                  in this period.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Document / Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">
                        Amount Contributed
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achievedDetail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-foreground">
                          {item.number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateDMY(item.date)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-muted/20 font-bold">
                    <TableRow>
                      <TableCell colSpan={2}>Total Achieved</TableCell>
                      <TableCell className="text-right text-primary">
                        {formatCurrency(achievedDetail.totalAchievedAmount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDrillDown(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
