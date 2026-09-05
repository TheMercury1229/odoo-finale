"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Printer,
  Scale,
} from "lucide-react";

import { useBalanceSheet } from "./reports-hooks";
import { formatCurrency, type ReportAccountLine } from "./reports-api";
import { triggerPrint } from "@/lib/print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
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
                Balance
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

export function BalanceSheetView() {
  const router = useRouter();
  const [asOf, setAsOf] = useState(getTodayString);

  const { data, isLoading, isError, error, refetch } = useBalanceSheet({
    asOf: asOf || undefined,
  });

  const totalAssets = data?.totalAssets ?? 0;
  const totalLiabilities = data?.totalLiabilities ?? 0;
  const totalCapital = data?.totalCapital ?? 0;
  const totalLiabilitiesAndCapital = data?.totalLiabilitiesAndCapital ?? 0;

  // Defensive check: Assets must equal Liabilities + Capital
  const difference = Math.abs(totalAssets - totalLiabilitiesAndCapital);
  const isBalanced = difference < 0.01;

  const handlePrint = () => {
    triggerPrint({
      title: `Balance Sheet - ${data?.asOf || asOf}`,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* ─── Top Action Bar (Print on Left, Date in Center, Back on Right) ─── */}
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
                <Scale className="size-5 text-primary print:hidden" />
                <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                  Balance Sheet
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Statement of financial position as of{" "}
                <span className="font-semibold text-foreground">
                  {data?.asOf || asOf}
                </span>
              </p>
            </div>

            {/* In-Balance / Out-of-Balance Status Badge */}
            {!isLoading && data && (
              <div className="mt-2 sm:mt-0">
                {isBalanced ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Balanced
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="gap-1.5 px-3 py-1 font-medium shadow-xs"
                  >
                    <AlertTriangle className="size-3.5" />
                    Mismatch: Out of balance by {formatCurrency(difference)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Spinner className="size-8" />
              <p className="mt-3 text-sm font-medium">
                Loading balance sheet...
              </p>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
              <AlertTriangle className="mx-auto mb-2 size-6" />
              <p className="font-semibold">Failed to load balance sheet</p>
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
              {/* ─── Two-Column Layout (Assets on Left, Liabilities & Capital on Right) ─── */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Column: Assets */}
                <div className="flex flex-col gap-6">
                  <SectionTable
                    title="Assets"
                    accounts={data.assets}
                    totalLabel="Total Assets"
                    totalAmount={totalAssets}
                    emptyMessage="No asset accounts with balances"
                  />
                </div>

                {/* Right Column: Liabilities & Capital */}
                <div className="flex flex-col gap-6">
                  <SectionTable
                    title="Liabilities"
                    accounts={data.liabilities}
                    totalLabel="Total Liabilities"
                    totalAmount={totalLiabilities}
                    emptyMessage="No liability accounts with balances"
                  />

                  <SectionTable
                    title="Capital / Equity"
                    accounts={data.capital}
                    totalLabel="Total Capital"
                    totalAmount={totalCapital}
                    emptyMessage="No capital accounts with balances"
                  />
                </div>
              </div>

              {/* ─── Bottom Summary & Verification ─── */}
              <div className="mt-2 rounded-lg border bg-muted/30 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:divide-x sm:divide-border/60">
                  {/* Total Assets */}
                  <div className="flex flex-col gap-1 sm:pr-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Assets
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                      {formatCurrency(totalAssets)}
                    </span>
                  </div>

                  {/* Total Liabilities + Capital */}
                  <div className="flex flex-col gap-1 sm:pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total Liabilities & Capital
                      </span>
                      {!isBalanced && (
                        <span className="text-xs font-medium text-destructive">
                          (Diff: {formatCurrency(difference)})
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                      {formatCurrency(totalLiabilitiesAndCapital)}
                    </span>
                  </div>
                </div>

                {/* Defensive Warning Badge when out of balance */}
                {!isBalanced && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>
                      <strong>Warning:</strong> Total Assets (
                      {formatCurrency(totalAssets)}) do not equal Total
                      Liabilities + Capital (
                      {formatCurrency(totalLiabilitiesAndCapital)}). Difference:{" "}
                      {formatCurrency(difference)}.
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
