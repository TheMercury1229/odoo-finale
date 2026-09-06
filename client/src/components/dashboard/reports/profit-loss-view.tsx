"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { useProfitLoss } from "./reports-hooks";
import { formatCurrency, type ReportAccountLine } from "./reports-api";
import { ReportsNavTabs } from "./reports-nav-tabs";
import { triggerPrint } from "@/lib/print";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

function getDefaultDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
  };
}

function SectionTable({
  title,
  accounts,
  totalLabel,
  totalAmount,
}: {
  title: string;
  accounts: ReportAccountLine[];
  totalLabel: string;
  totalAmount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between border-b pb-1.5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground">
                Account
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No active accounts with balances in this period.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((acc) => (
                <TableRow key={acc.accountId} className="hover:bg-muted/30">
                  <TableCell className="font-normal text-foreground">
                    {acc.accountName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(acc.balance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/40 font-semibold">
            <TableRow className="hover:bg-muted/40 border-t">
              <TableCell className="text-foreground">{totalLabel}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground">
                {formatCurrency(totalAmount)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

export function ProfitLossView() {
  const router = useRouter();
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);

  const { data, isLoading, isFetching, isError, error, refetch } = useProfitLoss({
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netProfit = data?.netProfit ?? 0;
  const isProfitable = netProfit >= 0;

  const handlePrint = () => {
    triggerPrint({
      title: `Profit & Loss - ${data?.from || fromDate} to ${data?.to || toDate}`,
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Reports Section Navigation Tabs ─── */}
      <ReportsNavTabs />

      {/* ─── Top Action & Filter Bar (Screen Only) ─── */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="fromDate"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
            >
              From
            </Label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-38 pl-8 text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor="toDate"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
            >
              To
            </Label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-38 pl-8 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* ─── Unified Document Header (Screen & Print) ─── */}
      <div className="flex min-w-0 flex-col gap-1 border-b pb-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-foreground">
                Profit & Loss Statement
              </h1>
              <p className="text-xs text-muted-foreground">
                Urban Furniture • Income and expenses from{" "}
                <span className="font-semibold text-foreground">
                  {data?.from || fromDate}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {data?.to || toDate}
                </span>
              </p>
            </div>
          </div>

          {!isLoading && data && (
            <div className="shrink-0 text-right flex items-center gap-3">
              {isProfitable ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-3.5" />
                  Net Profit: {formatCurrency(netProfit)}
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  className="gap-1.5 px-3 py-1 font-medium shadow-xs"
                >
                  <TrendingDown className="size-3.5" />
                  Net Loss: {formatCurrency(Math.abs(netProfit))}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Statement Content ─── */}
      <Card className="border border-border/80 shadow-xs print:border-none print:shadow-none overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Spinner className="size-8" />
              <p className="mt-3 text-sm font-medium">
                Loading profit & loss statement...
              </p>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
              <AlertTriangle className="mx-auto mb-2 size-6" />
              <p className="font-semibold">Failed to load profit & loss</p>
              <p className="mt-1 text-xs opacity-80">
                {(error as any)?.response?.data?.error ||
                  error?.message ||
                  "An unexpected error occurred."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : !data ? null : (
            <>
              {/* OPERATING INCOME SECTION */}
              <SectionTable
                title="Operating Income"
                accounts={data.income}
                totalLabel="Total Operating Income"
                totalAmount={totalIncome}
              />

              {/* OPERATING EXPENSES SECTION */}
              <SectionTable
                title="Operating Expenses"
                accounts={data.expenses}
                totalLabel="Total Operating Expenses"
                totalAmount={totalExpenses}
              />

              {/* FINAL NET PROFIT/LOSS SUMMARY CARD */}
              <div
                className={`mt-2 rounded-lg border p-5 ${isProfitable
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                  }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Financial Performance Summary
                    </span>
                    <h3 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
                      Net {isProfitable ? "Profit" : "Loss"} for Selected Period
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Total Income ({formatCurrency(totalIncome)}) minus Total
                      Expenses ({formatCurrency(totalExpenses)})
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono text-2xl font-black tracking-tight sm:text-3xl ${isProfitable
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                        }`}
                    >
                      {formatCurrency(netProfit)}
                    </span>
                    <div className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold">
                      {isProfitable ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          Positive Operating Margin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="size-3.5" />
                          Negative Operating Margin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
