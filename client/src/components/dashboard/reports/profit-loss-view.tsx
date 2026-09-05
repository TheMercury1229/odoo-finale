"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useProfitLoss } from "./reports-hooks";
import { formatCurrency, type ReportAccountLine } from "./reports-api";
import { triggerPrint } from "@/lib/print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  return {
    from: `${year}-01-01`,
    to: today,
  };
}

function SectionTable({
  title,
  accounts,
  totalLabel,
  totalAmount,
  emptyMessage,
}: {
  title: string;
  accounts: ReportAccountLine[];
  totalLabel: string;
  totalAmount: number;
  emptyMessage?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          {title}
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-medium text-foreground">
                Account Name
              </TableHead>
              <TableHead className="text-right font-medium text-foreground">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-4 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage || "No accounts to display"}
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

  const { data, isLoading, isError, error, refetch } = useProfitLoss({
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* ─── Top Action Bar (Print on Left, Date Range in Center, Back on Right) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 font-medium"
          >
            <Printer className="size-4" />
            Print
          </Button>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="fromDate"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              From
            </Label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-40 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor="toDate"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              To
            </Label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-40 pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 font-medium"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      </div>

      {/* ─── Printable / Main Report Card ─── */}
      <Card className="border shadow-xs print:border-none print:shadow-none">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary print:hidden" />
                <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                  Profit & Loss Statement
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Income and expenses for the period{" "}
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
        </CardHeader>

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
              <p className="font-semibold">
                Failed to load profit & loss statement
              </p>
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
              {/* ─── Income Section ─── */}
              <SectionTable
                title="Income"
                accounts={data.income}
                totalLabel="Total Income"
                totalAmount={totalIncome}
                emptyMessage="No income accounts with activity in this period"
              />

              {/* ─── Expenses Section ─── */}
              <SectionTable
                title="Expenses"
                accounts={data.expenses}
                totalLabel="Total Expenses"
                totalAmount={totalExpenses}
                emptyMessage="No expense accounts with activity in this period"
              />

              {/* ─── Bottom Summary: Net Profit prominently styled ─── */}
              <div
                className={`rounded-lg border p-5 transition-colors ${
                  isProfitable
                    ? "border-emerald-200 bg-emerald-500/10 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-rose-200 bg-rose-500/10 dark:border-rose-900/50 dark:bg-rose-950/20"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    {isProfitable ? (
                      <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-5" />
                      </div>
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                        <TrendingDown className="size-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Summary
                      </div>
                      <div className="text-base font-bold text-foreground">
                        {isProfitable ? "Net Profit" : "Net Loss"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-xs text-muted-foreground">
                      Total Income ({formatCurrency(totalIncome)}) - Total
                      Expenses ({formatCurrency(totalExpenses)})
                    </span>
                    <span
                      className={`font-mono text-2xl font-black tabular-nums sm:text-3xl ${
                        isProfitable
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(netProfit)}
                    </span>
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
