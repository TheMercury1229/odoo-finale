"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  PiggyBank,
  Printer,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";

import { useBudgetReport } from "./reports-hooks";
import { formatCurrency, type BudgetReportItem } from "./reports-api";
import { ReportsNavTabs } from "./reports-nav-tabs";
import { formatDate } from "@/lib/utils";
import { triggerPrint } from "@/lib/print";
import { Badge } from "@/components/ui/badge";
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

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function BudgetReportView() {
  const router = useRouter();
  const [asOf, setAsOf] = useState(getTodayString);

  const {
    data: report = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useBudgetReport({
    asOf: asOf || undefined,
  });

  const totalPlanned = report.reduce((sum, b) => sum + b.plannedAmount, 0);
  const totalActual = report.reduce((sum, b) => sum + b.actualAmount, 0);
  const totalVariance = totalPlanned - totalActual;
  const overBudgetCount = report.filter((b) => b.percentUsed > 100).length;

  const handlePrint = () => {
    triggerPrint({
      title: `Budget Report - As of ${asOf}`,
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Reports Section Navigation Tabs ─── */}
      <ReportsNavTabs />

      {/* ─── Top Action & Filter Bar (Screen Only) ─── */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="asOfDate"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
          >
            As Of Date
          </Label>
          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
            <Input
              id="asOfDate"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-9 w-44 pl-8 text-xs font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/budgets")}
            className="gap-1.5 h-9"
          >
            <PiggyBank className="size-3.5" />
            View Budgets
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 font-medium bg-primary text-primary-foreground h-9"
          >
            <Printer className="size-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* ─── Printable Document Header ─── */}
      <div className="flex min-w-0 flex-col gap-1 border-b pb-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-foreground">
                Budget Performance Report
              </h1>
              <p className="text-xs text-muted-foreground">
                Urban Furniture • Planned Targets vs Actual General Ledger
                Postings
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              As Of Date
            </div>
            <div className="text-sm font-semibold text-foreground">
              {formatDate(asOf)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary Metric Cards (hidden in print) ─── */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Planned
            </CardTitle>
            <PiggyBank className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              <span className="break-all text-xl sm:text-2xl">
                {formatCurrency(totalPlanned)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {report.length} active{" "}
              {report.length === 1 ? "budget" : "budgets"}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Actual
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              <span className="break-all text-xl sm:text-2xl">
                {formatCurrency(totalActual)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Posted journal activity as of {formatDate(asOf)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Variance
            </CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${totalVariance < 0 ? "text-destructive" : "text-emerald-600"
                }`}
            >
              <span className="break-all text-xl sm:text-2xl">
                {formatCurrency(totalVariance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVariance >= 0
                ? "Remaining budget capacity"
                : "Overall budget overrun"}
            </p>
            {overBudgetCount > 0 ? (
              <Badge variant="destructive" className="mt-2 w-fit text-xs">
                {overBudgetCount} over budget
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Performance Table ─── */}
      <div className="hidden min-w-0 max-w-full overflow-hidden rounded-lg border bg-card shadow-xs md:block">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">
                  Budget Name
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Period
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Planned Amount
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Actual Amount
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Variance
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  % Used
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner className="size-6 text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Calculating budget actuals...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : report.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-48 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-muted p-3">
                        <Target className="size-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          No budgets found for this organization
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Create budgets to monitor spending and revenue
                          actuals.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push("/budgets/new")}
                        className="gap-2 mt-1"
                      >
                        <PiggyBank className="size-4" />
                        Create Budget
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                report.map((b) => {
                  const isOverBudget = b.percentUsed > 100;
                  return (
                    <TableRow
                      key={b.budgetId}
                      onClick={() => router.push(`/budgets/${b.budgetId}`)}
                      className={`cursor-pointer transition-colors hover:bg-muted/30 ${isOverBudget
                          ? "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive"
                          : ""
                        }`}
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{b.budgetName}</span>
                          {isOverBudget && (
                            <span className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="size-3 inline" />
                              Over budget by{" "}
                              {formatCurrency(Math.abs(b.variance))}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        {formatCurrency(b.plannedAmount)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-sm tabular-nums font-medium text-foreground">
                        {formatCurrency(b.actualAmount)}
                      </TableCell>

                      <TableCell
                        className={`text-right font-mono text-sm tabular-nums font-medium ${b.variance < 0
                            ? "text-destructive"
                            : "text-foreground"
                          }`}
                      >
                        {formatCurrency(b.variance)}
                      </TableCell>

                      <TableCell className="text-right">
                        {isOverBudget ? (
                          <Badge
                            variant="destructive"
                            className="font-mono text-xs font-semibold px-2 py-0.5"
                          >
                            {b.percentUsed}%
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              b.percentUsed >= 80
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono text-xs font-semibold px-2 py-0.5"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-xs font-semibold px-2 py-0.5"
                            }
                          >
                            {b.percentUsed}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            {report.length > 0 && (
              <TableFooter className="bg-muted/40 font-semibold border-t">
                <TableRow className="hover:bg-muted/40">
                  <TableCell colSpan={2} className="text-foreground">
                    Total Organization Budgets
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-foreground">
                    {formatCurrency(totalPlanned)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-foreground">
                    {formatCurrency(totalActual)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${totalVariance < 0 ? "text-destructive" : "text-foreground"
                      }`}
                  >
                    {formatCurrency(totalVariance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={totalVariance < 0 ? "destructive" : "secondary"}
                      className="font-mono text-xs font-semibold"
                    >
                      {totalPlanned > 0
                        ? `${Math.round((totalActual / totalPlanned) * 100)}%`
                        : "0%"}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <Card>
            <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2">
              <Spinner className="size-6 text-primary" />
              <p className="text-xs text-muted-foreground">
                Calculating budget actuals...
              </p>
            </CardContent>
          </Card>
        ) : report.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Target className="size-6 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">No budgets found</p>
                <p className="text-xs text-muted-foreground">
                  Create a budget to monitor spending and revenue actuals.
                </p>
              </div>
              <Button size="sm" onClick={() => router.push("/budgets/new")}>
                <PiggyBank data-icon="inline-start" />
                Create Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          report.map((b) => {
            const isOverBudget = b.percentUsed > 100;
            return (
              <Card
                key={b.budgetId}
                onClick={() => router.push(`/budgets/${b.budgetId}`)}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${isOverBudget ? "border-destructive/40" : ""
                  }`}
              >
                <CardHeader className="gap-2 pb-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="wrap-break-word text-base">
                        {b.budgetName}
                      </CardTitle>
                      <CardDescription className="mt-1 wrap-break-word">
                        {b.analyticAccountName}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={isOverBudget ? "destructive" : "secondary"}
                      className="shrink-0 font-mono text-xs"
                    >
                      {b.percentUsed}%
                    </Badge>
                  </div>
                  {isOverBudget ? (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="size-3" />
                      Over budget by {formatCurrency(Math.abs(b.variance))}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Period</p>
                    <p className="mt-1 wrap-break-word">
                      {formatDate(b.periodStart)} - {formatDate(b.periodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Responsible</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1 wrap-break-word">
                      <User className="size-3.5 shrink-0 text-muted-foreground" />
                      {b.responsiblePersonName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned</p>
                    <p className="mt-1 font-mono tabular-nums">
                      {formatCurrency(b.plannedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual</p>
                    <p className="mt-1 font-mono tabular-nums">
                      {formatCurrency(b.actualAmount)}
                    </p>
                  </div>
                  <div className="col-span-2 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Variance</p>
                    <p
                      className={`mt-1 font-mono font-medium tabular-nums ${b.variance < 0 ? "text-destructive" : "text-foreground"
                        }`}
                    >
                      {formatCurrency(b.variance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
