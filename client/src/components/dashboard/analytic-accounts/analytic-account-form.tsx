"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Layers, Tags } from "lucide-react";
import axios from "axios";

import {
  type AnalyticAccount,
  createAnalyticAccount,
  updateAnalyticAccount,
} from "./analytic-accounts-api";
import { fetchBudgetsForAnalyticAccount } from "../budgets/budgets-api";
import { formatCurrency } from "../reports/reports-api";
import { BudgetStatusBadge } from "../budgets/budgets-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

const analyticAccountFormSchema = z.object({
  name: z.string().trim().min(1, "Analytic account name is required"),
  type: z.enum(["income", "expense"]),
});

type AnalyticAccountFormValues = z.infer<typeof analyticAccountFormSchema>;

interface AnalyticAccountFormProps {
  initialData?: AnalyticAccount;
}

function formatDateDMY(dateStr?: string | null) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function AnalyticAccountForm({ initialData }: AnalyticAccountFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(initialData);

  const [serverError, setServerError] = useState<string | null>(null);

  // Reverse lookup: fetch budgets linked to this analytic account
  const { data: linkedBudgets = [], isLoading: isLoadingBudgets } = useQuery({
    queryKey: ["analytic-account-budgets", initialData?.id],
    queryFn: () => fetchBudgetsForAnalyticAccount(initialData!.id),
    enabled: Boolean(initialData?.id),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AnalyticAccountFormValues>({
    resolver: zodResolver(analyticAccountFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "expense",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AnalyticAccountFormValues) => {
      if (isEditing && initialData) {
        return updateAnalyticAccount(initialData.id, values);
      }
      return createAnalyticAccount(values);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["analytic-accounts"] });
      toast.add({
        type: "success",
        title: isEditing
          ? `Analytic account "${saved.name}" updated successfully`
          : `Analytic account "${saved.name}" created successfully`,
      });
      router.push("/analytic-accounts");
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

  const onSubmit = (values: AnalyticAccountFormValues) => {
    setServerError(null);
    mutation.mutate(values);
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6 p-2 sm:p-4">
      {/* ─── Form Card ─── */}
      <Card className="shadow-xs">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Tags className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {isEditing ? "Edit Analytic Account" : "New Analytic Account"}
                </CardTitle>
                <CardDescription>
                  {isEditing
                    ? "Update name or classification for this cost center or income source."
                    : "Track revenue or expenses against projects, departments, or contracts."}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/analytic-accounts")}
                disabled={isSubmitting || mutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form="analytic-account-form"
                size="sm"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || mutation.isPending}
                className="gap-1.5 font-medium shadow-xs"
              >
                {isSubmitting || mutation.isPending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Confirm
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form id="analytic-account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold text-foreground">
                  Analytic Account <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Marketing, Project Alpha, R&D"
                  {...register("name")}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="font-semibold text-foreground">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-xs text-destructive">
                    {errors.type.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Part C: Reverse Lookup Table (All the Budget List where Analytic Account is used) ─── */}
      {isEditing && (
        <Card className="overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 border-b pb-3 pt-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Budgets Using this Analytic Account
            </CardTitle>
            <CardDescription>
              All the Budget List where the Analytic Account is used. Click any row
              to open the budget.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>Budget</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Achieved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBudgets ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    <Spinner className="size-5 mx-auto text-primary mb-1" />
                    <span className="text-xs text-muted-foreground">
                      Loading budgets...
                    </span>
                  </TableCell>
                </TableRow>
              ) : linkedBudgets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-sm text-muted-foreground"
                  >
                    No budgets are currently using this analytic account.
                  </TableCell>
                </TableRow>
              ) : (
                linkedBudgets.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => router.push(`/budgets/${b.id}`)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground hover:underline">
                      {b.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDMY(b.periodStart)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDMY(b.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <BudgetStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(b.committedAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {b.achievedAmount != null
                        ? formatCurrency(Number(b.achievedAmount))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
