"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Plus, Search, ShoppingBag } from "lucide-react";

import { useCustomerInvoices } from "./customer-invoices-hooks";
import type { InvoiceStatus } from "./customer-invoices-api";
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

export function getInvoiceStatusBadge(status: InvoiceStatus) {
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

export function CustomerInvoicesView() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: customerInvoices = [], isLoading, isError } =
    useCustomerInvoices({
      search,
      status: statusFilter,
    });

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "Paid", label: "Paid" },
    { id: "Partial", label: "Partial" },
    { id: "Not Paid", label: "Not Paid" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top Action Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Search Bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number, customer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        {/* Right: Discoverability button */}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/sales-orders" />}
          className="text-xs font-medium"
        >
          <Plus className="mr-1.5 size-3.5" />
          New Invoice from Sales Order
        </Button>
      </div>

      {/* ─── Status Filter Tabs ─── */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 overflow-x-auto">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Main Table Card ─── */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-destructive">
              Failed to load customer invoices. Please try refreshing.
            </div>
          ) : customerInvoices.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
              <FileText className="size-10 text-muted-foreground/50" />
              <p className="font-medium">No customer invoices found.</p>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/sales-orders" />}
              >
                Go to Sales Orders to create an invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-40 font-semibold">Invoice No.</TableHead>
                  <TableHead className="font-semibold">Customer Name</TableHead>
                  <TableHead className="w-36 font-semibold">Invoice Date</TableHead>
                  <TableHead className="w-36 font-semibold">Due Date</TableHead>
                  <TableHead className="w-32 font-semibold">Status</TableHead>
                  <TableHead className="w-36 text-right font-semibold">
                    Total
                  </TableHead>
                  <TableHead className="w-36 text-right font-semibold">
                    Amount Due
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    onClick={() => router.push(`/customer-invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono font-semibold text-primary">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {inv.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {formatCurrency(inv.amountDue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
