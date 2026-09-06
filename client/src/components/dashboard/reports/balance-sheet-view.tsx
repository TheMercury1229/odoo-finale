"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Printer,
  RefreshCw,
  Scale,
} from "lucide-react";

import { useBalanceSheet } from "./reports-hooks";
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

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
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
                Balance
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
                  No accounts with balances in this category.
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

  const { data, isLoading, isFetching, isError, error, refetch } = useBalanceSheet({
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
              <Scale className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-foreground">
                Balance Sheet
              </h1>
              <p className="text-xs text-muted-foreground">
                Urban Furniture • Statement of Financial Position as of{" "}
                <span className="font-semibold text-foreground">
                  {data?.asOf || asOf}
                </span>
              </p>
            </div>
          </div>

          {!isLoading && data && (
            <div className="shrink-0 text-right flex items-center gap-3">
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
      </div>

      {/* ─── Main Statement Content ─── */}
      <Card className="border border-border/80 shadow-xs print:border-none print:shadow-none overflow-hidden">
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
              {/* ASSETS SECTION */}
              <SectionTable
                title="Assets"
                accounts={data.assets}
                totalLabel="Total Assets"
                totalAmount={totalAssets}
              />

              {/* LIABILITIES SECTION */}
              <SectionTable
                title="Liabilities"
                accounts={data.liabilities}
                totalLabel="Total Liabilities"
                totalAmount={totalLiabilities}
              />

              {/* CAPITAL & EQUITY SECTION */}
              <SectionTable
                title="Capital & Equity"
                accounts={data.capital}
                totalLabel="Total Capital & Equity"
                totalAmount={totalCapital}
              />

              {/* GRAND SUMMARY AUDIT COMPARISON */}
              <div className="mt-2 rounded-lg border border-border/80 bg-muted/20 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Accounting Equation Verification (Assets = Liabilities +
                  Capital)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border bg-card p-3 shadow-2xs">
                    <span className="text-sm font-medium text-foreground">
                      Total Assets:
                    </span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {formatCurrency(totalAssets)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-card p-3 shadow-2xs">
                    <span className="text-sm font-medium text-foreground">
                      Total Liabilities + Capital:
                    </span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {formatCurrency(totalLiabilitiesAndCapital)}
                    </span>
                  </div>
                </div>

                {!isBalanced && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>
                      Difference: {formatCurrency(difference)}. Check unposted
                      journal entries or non-balancing manual postings.
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
