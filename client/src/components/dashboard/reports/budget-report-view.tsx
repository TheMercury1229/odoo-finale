"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  PieChart,
  PiggyBank,
  Printer,
  Target,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";

import { useBudgetReport } from "./reports-hooks";
import { formatCurrency, type BudgetReportItem } from "./reports-api";
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

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function BudgetReportView() {
  const router = useRouter();
  const [asOf, setAsOf] = useState(getTodayString);

  const { data: report = [], isLoading, isError } = useBudgetReport({
    asOf: asOf || undefined,
  });

  const totalPlanned = report.reduce((sum, b) => sum + b.plannedAmount, 0);
  const totalActual = report.reduce((sum, b) => sum + b.actualAmount, 0);
  const totalVariance = totalPlanned - totalActual;
  const overallPercent =
    totalPlanned > 0
      ? Math.round(((totalActual / totalPlanned) * 100 + Number.EPSILON) * 100) / 100
      : 0;

  const overBudgetCount = report.filter((b) => b.percentUsed > 100).length;

  const handlePrint = () => {
    triggerPrint({
      title: `Budget Report - As of ${asOf}`,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* ─── Top Action Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 font-medium"
          >
            <Printer className="size-4" />
            Print Report
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Label
            htmlFor="asOfDate"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            As Of
          </Label>
          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
            <Input
              id="asOfDate"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-9 w-44 pl-9 text-sm"
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/budgets")}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          View Budgets
        </Button>
      </div>

      {/* ─── Printable Document Header ─── */}
      <div className="flex flex-col gap-1 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Budget Performance Report
              </h1>
              <p className="text-xs text-muted-foreground">
                Urban Furniture • Planned Targets vs Actual General Ledger
                Postings
              </p>
            </div>
          </div>
          <div className="text-right">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Planned
            </CardTitle>
            <PiggyBank className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {formatCurrency(totalPlanned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {report.length} active {report.length === 1 ? "budget" : "budgets"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Actual
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {formatCurrency(totalActual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Posted journal activity as of {formatDate(asOf)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Variance
            </CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                totalVariance < 0 ? "text-destructive" : "text-emerald-600"
              }`}
            >
              {formatCurrency(totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVariance >= 0
                ? "Remaining budget capacity"
                : "Overall budget overrun"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Budget Health
            </CardTitle>
            <PieChart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {overallPercent}%
              </span>
              {overBudgetCount > 0 ? (
                <Badge variant="destructive" className="gap-1 text-xs font-medium">
                  <AlertTriangle className="size-3" />
                  {overBudgetCount} Over Budget
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  On Track
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overBudgetCount === 0
                ? "All budgets within planned limits"
                : `${overBudgetCount} budget(s) exceeded 100% capacity`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Performance Table ─── */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground">
                Budget Name
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Analytic Account
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Period
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Responsible Person
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
                <TableCell colSpan={8} className="h-48 text-center">
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
                  colSpan={8}
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
                        Create budgets to monitor spending and revenue actuals.
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
                    className={`hover:bg-muted/30 transition-colors ${
                      isOverBudget
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
                            Over budget by {formatCurrency(Math.abs(b.variance))}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm font-medium text-foreground">
                      {b.analyticAccountName}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        <span>{b.responsiblePersonName}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(b.plannedAmount)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm tabular-nums font-medium text-foreground">
                      {formatCurrency(b.actualAmount)}
                    </TableCell>

                    <TableCell
                      className={`text-right font-mono text-sm tabular-nums font-medium ${
                        b.variance < 0 ? "text-destructive" : "text-foreground"
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
                <TableCell colSpan={4} className="text-foreground">
                  Total Organization Budgets
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {formatCurrency(totalPlanned)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {formatCurrency(totalActual)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${
                    totalVariance < 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {formatCurrency(totalVariance)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={overallPercent > 100 ? "destructive" : "secondary"}
                    className="font-mono text-xs font-semibold"
                  >
                    {overallPercent}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
