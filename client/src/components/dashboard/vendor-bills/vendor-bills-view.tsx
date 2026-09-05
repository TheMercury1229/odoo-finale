"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Plus, Search, ShoppingCart } from "lucide-react";

import { useVendorBills } from "./vendor-bills-hooks";
import type { BillStatus } from "./vendor-bills-api";
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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getBillStatusBadge(status: BillStatus) {
  switch (status) {
    case "Paid":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-0.5">
          Paid
        </Badge>
      );
    case "Partial":
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-0.5">
          Partial
        </Badge>
      );
    case "Not Paid":
    default:
      return (
        <Badge variant="destructive" className="font-medium px-2.5 py-0.5">
          Not Paid
        </Badge>
      );
  }
}

export function VendorBillsView() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: vendorBills = [], isLoading, isError } = useVendorBills({
    search,
    status: statusFilter,
  });

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "Not Paid", label: "Not Paid" },
    { id: "Partial", label: "Partial" },
    { id: "Paid", label: "Paid" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top Action Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Discoverability button to Purchase Orders since bills originate from POs */}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/purchase-orders" />}
          className="text-muted-foreground hover:text-foreground"
        >
          <ShoppingCart className="mr-1.5 size-4" />
          Go to Purchase Orders
        </Button>

        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search bill no, ref, or vendor..."
            aria-label="Search vendor bills"
            className="pl-9"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {statusTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium px-3 rounded-md"
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Heading Row ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Bills</h1>
          {!isLoading && vendorBills.length > 0 ? (
            <Badge variant="secondary">{vendorBills.length}</Badge>
          ) : null}
        </div>
      </div>

      {/* ─── Main Content ─── */}
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load vendor bills. Please try again.
          </CardContent>
        </Card>
      ) : vendorBills.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No vendor bills found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchInput || statusFilter !== "all"
                ? "No vendor bills match your filter criteria. Try clearing search or filters."
                : "Bills are generated directly from confirmed Purchase Orders. Open a confirmed PO and click 'Create Bill'."}
            </p>
            {!searchInput && statusFilter === "all" && (
              <Button
                nativeButton={false}
                render={<Link href="/purchase-orders" />}
                className="mt-5"
              >
                <ShoppingCart className="mr-1.5 size-4" />
                View Purchase Orders
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-40 font-semibold">Bill No.</TableHead>
                <TableHead className="font-semibold">Vendor Name</TableHead>
                <TableHead className="w-32 font-semibold">Invoice Date</TableHead>
                <TableHead className="w-32 font-semibold">Due Date</TableHead>
                <TableHead className="w-28 font-semibold">Status</TableHead>
                <TableHead className="w-36 text-right font-semibold">Total</TableHead>
                <TableHead className="w-36 text-right font-semibold">Amount Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  tabIndex={0}
                  onClick={() => router.push(`/vendor-bills/${bill.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/vendor-bills/${bill.id}`);
                    }
                  }}
                >
                  <TableCell className="font-semibold text-primary">
                    <Link
                      href={`/vendor-bills/${bill.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bill.billNumber}
                    </Link>
                    {bill.vendorReference && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Ref: {bill.vendorReference}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {bill.vendorName || bill.vendor?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(bill.invoiceDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(bill.dueDate)}
                  </TableCell>
                  <TableCell>{getBillStatusBadge(bill.status)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(bill.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
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
