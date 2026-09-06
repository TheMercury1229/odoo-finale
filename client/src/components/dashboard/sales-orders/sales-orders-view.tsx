"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShoppingBag } from "lucide-react";

import { authClient } from "@/lib/auth";
import { DataTable } from "@/components/primitives/DataTable";
import { TablePagination } from "@/components/primitives/TablePagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { useSalesOrders } from "./sales-orders-hooks";
import type { SalesOrderStatus } from "./sales-orders-api";
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

export function getSalesOrderStatusBadge(status: SalesOrderStatus) {
  const labels: Record<SalesOrderStatus, string> = {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    draft: "Draft",
  };
  return <StatusBadge status={labels[status] || "Draft"} />;
}

export function SalesOrdersView() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = session?.user.role;
  const canCreate = role === "admin" || role === "accountant";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const {
    data: salesOrders = [],
    isLoading,
    isError,
  } = useSalesOrders({
    search,
    status: statusFilter,
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(salesOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSalesOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return salesOrders.slice(start, start + PAGE_SIZE);
  }, [salesOrders, safeCurrentPage]);

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "confirmed", label: "Confirmed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top Action Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by SO number, customer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        {/* Right: New Button */}
        {canCreate && (
          <Button
            nativeButton={false}
            render={<Link href="/sales-orders/new" />}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Plus className="mr-1.5 size-4" />
            New Sales Order
          </Button>
        )}
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
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${isActive
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
      <DataTable className="border-border/80">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            Failed to load sales orders. Please try refreshing.
          </div>
        ) : salesOrders.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
            <ShoppingBag className="size-10 text-muted-foreground/50" />
            <p className="font-medium">No sales orders found.</p>
            {canCreate && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/sales-orders/new" />}
              >
                Create your first Sales Order
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-36 font-semibold">Order No.</TableHead>
                  <TableHead className="font-semibold">Customer Name</TableHead>
                  <TableHead className="w-36 font-semibold">Order Date</TableHead>
                  <TableHead className="w-32 font-semibold">Status</TableHead>
                  <TableHead className="w-40 text-right font-semibold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSalesOrders.map((so) => (
                  <TableRow
                    key={so.id}
                    onClick={() => router.push(`/sales-orders/${so.id}`)}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono font-semibold text-primary">
                      {so.soNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {so.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(so.orderDate)}
                    </TableCell>
                    <TableCell>{getSalesOrderStatusBadge(so.status)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {formatCurrency(so.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!isLoading && salesOrders.length > 0 && (
              <TablePagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={salesOrders.length}
                pageSize={PAGE_SIZE}
                itemLabel="sales orders"
                onPageChange={setCurrentPage}
              />


            )}

          </>
        )}
      </DataTable>
    </div>
  );
}
