"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Package,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";

import { useStockReport } from "./reports-hooks";
import type { StockReportItem } from "./reports-api";
import { ReportsNavTabs } from "./reports-nav-tabs";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { TablePagination } from "@/components/primitives/TablePagination";
import { triggerPrint } from "@/lib/print";
import { formatCurrency } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function getStatusBadge(status: StockReportItem["status"]) {
  return <StatusBadge status={status} />;
}

export function StockReportView() {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useStockReport();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const products = data?.products || [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCategory = p.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory) return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && p.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safeCurrentPage]);

  const filteredStockUnits = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.currentStock, 0);
  }, [filteredProducts]);

  const filteredValuation = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.valuation, 0);
  }, [filteredProducts]);

  const handlePrint = () => {
    triggerPrint();
  };

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "In Stock", label: "In Stock" },
    { id: "Low Stock", label: "Low Stock" },
    { id: "Out of Stock", label: "Out of Stock" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Reports Section Navigation Tabs ─── */}
      <ReportsNavTabs />

      {/* ─── Printable Document Header ─── */}
      <div className="flex min-w-0 flex-col gap-1 border-b pb-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-foreground">
                Stock & Inventory Report
              </h1>
              <p className="text-xs text-muted-foreground">
                Urban Furniture • Real-time stock on hand, units purchased vs sold, and inventory valuation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              type="button"
              onClick={handlePrint}
              className="gap-2 font-medium bg-primary text-primary-foreground h-9"
            >
              <Printer className="size-4" />
              Print Report
            </Button>
          </div>

          <div className="shrink-0 text-right hidden print:block">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Report Date
            </div>
            <div className="text-sm font-semibold text-foreground">
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Metric Summary Cards ─── */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Goods Items
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {data?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active goods catalog items
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Units on Hand
            </CardTitle>
            <Boxes className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {data?.totalStockUnits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchased minus sold
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Inventory Valuation
            </CardTitle>
            <div className="rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
              <Boxes className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data?.totalValuation || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unit cost price &times; stock on hand
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search (Screen Only) ─── */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search product or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="w-44">
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val ?? "all")}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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

        {(searchQuery ||
          statusFilter !== "all" ||
          categoryFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
      </div>

      {/* ─── Main Printable Stock Table ─── */}
      <Card className="border border-border/80 shadow-xs print:border-none print:shadow-none overflow-hidden">
        <CardHeader className="border-b pb-3 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Inventory Status & Valuation
              </CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredProducts.length} of {products.length} goods items
              </CardDescription>
            </div>
            {filteredProducts.length > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredProducts.length} items
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">
                  Product Name
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Category
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Cost Price
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Sales Price
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Purchased
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Sold
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Stock on Hand
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Valuation
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      Loading inventory stock data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    No products matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Screen table rows (paginated) */}
                  {paginatedProducts.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => router.push(`/products/${p.id}`)}
                      className="cursor-pointer hover:bg-muted/30 transition-colors print:hidden"
                    >
                      <TableCell className="font-medium text-foreground">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.category}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatCurrency(p.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatCurrency(p.salesPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {p.purchasedQty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {p.soldQty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {p.currentStock}
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(p.valuation)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Print-only table rows (all filtered products) */}
                  {filteredProducts.map((p) => (
                    <TableRow key={`print-${p.id}`} className="hidden print:table-row">
                      <TableCell className="font-medium text-foreground">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.category}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatCurrency(p.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatCurrency(p.salesPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {p.purchasedQty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {p.soldQty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {p.currentStock}
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(p.valuation)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
            <TableFooter className="bg-muted/40 font-semibold border-t">
              <TableRow className="hover:bg-muted/40">
                <TableCell colSpan={6} className="text-foreground font-bold">
                  Total ({filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"})
                </TableCell>
                <TableCell className="text-right font-mono font-bold tabular-nums text-foreground">
                  {filteredStockUnits.toLocaleString()}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-mono font-bold tabular-nums text-foreground">
                  {formatCurrency(filteredValuation)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          {!isLoading && filteredProducts.length > 0 && (
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              pageSize={PAGE_SIZE}
              itemLabel="products"
              onPageChange={setCurrentPage}
              className="print:hidden"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
