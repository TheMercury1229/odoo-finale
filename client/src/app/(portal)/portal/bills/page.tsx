"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Receipt, Search } from "lucide-react";
import { useState } from "react";

import { usePortalBills } from "@/components/portal/portal-hooks";
import type { PortalDocStatus } from "@/components/portal/portal-api";
import { triggerPrint } from "@/lib/print";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function getPortalStatusBadge(status: PortalDocStatus) {
  return <StatusBadge status={status} />;
}

export default function PortalBillsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const { data: bills = [], isLoading, isError } = usePortalBills();

  const filteredBills = bills.filter((b) => {
    if (!searchInput.trim()) return true;
    const term = searchInput.toLowerCase().trim();
    return (
      b.billNumber.toLowerCase().includes(term) ||
      (b.vendorReference && b.vendorReference.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Bills
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View all vendor bills and track payment status.
          </p>
        </div>
      </div>

      {/* ─── Printable Header (Only Visible in Print) ─── */}

      {/* ─── Content ─── */}
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center text-sm text-destructive">
            Unable to load your bills at this time. Please try again later.
          </CardContent>
        </Card>
      ) : filteredBills.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="pt-12 pb-12 text-center flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <Receipt className="size-8" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              {bills.length === 0
                ? "You have no vendor bills."
                : "No matching bills found."}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {bills.length === 0
                ? "When vendor bills are issued for your purchases, they will appear here."
                : "Try adjusting your search criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Bill No.</TableHead>
                <TableHead className="font-semibold">Bill Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Amount Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  onClick={() => router.push(`/portal/bills/${bill.id}`)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium font-mono text-primary">
                    <Link
                      href={`/portal/bills/${bill.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bill.billNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bill.invoiceDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bill.dueDate)}
                  </TableCell>
                  <TableCell>{getPortalStatusBadge(bill.status)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(bill.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCurrency(bill.amountDue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
