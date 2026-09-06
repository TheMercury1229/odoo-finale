"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";

import { authClient } from "@/lib/auth";
import { DataTable } from "@/components/primitives/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { TablePagination } from "@/components/primitives/TablePagination";
import { usePurchaseOrders } from "./purchase-orders-hooks";
import type { PurchaseOrderStatus } from "./purchase-orders-api";
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

function getStatusBadge(status: PurchaseOrderStatus) {
  const labels: Record<PurchaseOrderStatus, string> = {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    draft: "Draft",
  };
  return <StatusBadge status={labels[status] || "Draft"} />;
}

export function PurchaseOrdersView() {
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
    data: purchaseOrders = [],
    isLoading,
    isError,
  } = usePurchaseOrders({
    search,
    status: statusFilter,
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(purchaseOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPurchaseOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return purchaseOrders.slice(start, start + PAGE_SIZE);
  }, [purchaseOrders, safeCurrentPage]);

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "confirmed", label: "Confirmed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top Action Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        {canCreate && (
          <Button
            nativeButton={false}
            render={<Link href="/purchase-orders/new" />}
          >
            <Plus data-icon="inline-start" className="size-4" />
            New
          </Button>
        )}

        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search PO or vendor..."
            aria-label="Search purchase orders"
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Purchase Orders
          </h1>
          {!isLoading && purchaseOrders.length > 0 ? (
            <Badge variant="secondary">{purchaseOrders.length}</Badge>
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
            Failed to load purchase orders. Please try again.
          </CardContent>
        </Card>
      ) : purchaseOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingCart className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No purchase orders found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchInput || statusFilter !== "all"
                ? "No purchase orders match your filter criteria. Try clearing search or filters."
                : "Get started by creating your first purchase order with a vendor."}
            </p>
            {canCreate && !searchInput && statusFilter === "all" && (
              <Button
                nativeButton={false}
                render={<Link href="/purchase-orders/new" />}
                className="mt-5"
              >
                <Plus data-icon="inline-start" className="size-4" />
                Create Purchase Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable className="border-border/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-36 font-semibold">PO No.</TableHead>
                <TableHead className="font-semibold">Vendor Name</TableHead>
                <TableHead className="w-36 font-semibold">PO Date</TableHead>
                <TableHead className="w-32 font-semibold">Status</TableHead>
                <TableHead className="w-40 text-right font-semibold">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPurchaseOrders.map((po) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  tabIndex={0}
                  onClick={() => router.push(`/purchase-orders/${po.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/purchase-orders/${po.id}`);
                    }
                  }}
                >
                  <TableCell className="font-semibold text-primary">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {po.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {po.vendorName || po.vendor?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(po.orderDate)}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(po.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!isLoading && purchaseOrders.length > 0 && (
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={purchaseOrders.length}
              pageSize={PAGE_SIZE}
              itemLabel="purchase orders"
              onPageChange={setCurrentPage}
            />
          )}
        </DataTable>
      )}
    </div>
  );
}
