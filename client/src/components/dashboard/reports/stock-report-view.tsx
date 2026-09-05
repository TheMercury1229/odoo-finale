"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Package,
  Printer,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { useStockReport } from "./reports-hooks";
import type { StockReportItem } from "./reports-api";
import { StatusBadge } from "@/components/primitives/StatusBadge";
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

  const filteredStockUnits = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.currentStock, 0);
  }, [filteredProducts]);

  const filteredValuation = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.valuation, 0);
  }, [filteredProducts]);

  const handlePrint = () => {
    triggerPrint();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* ─── Top Bar Actions (Screen Only) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Stock & Inventory Report
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time stock on hand, units purchased vs sold, and inventory
              valuation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-1.5 size-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="bg-primary text-primary-foreground font-medium"
          >
            <Printer className="mr-1.5 size-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* ─── Metric Summary Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

        <Card className="border border-border/80 shadow-xs sm:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
              Based on unit cost price &times; available stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search ─── */}
      <Card className="border border-border/60 shadow-xs print:hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-55 flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            <div className="w-40">
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val ?? "all")}
              >
                <SelectTrigger className="text-sm">
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

            <div className="w-37.5">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val ?? "all")}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
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
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Printable Stock Table ─── */}
      <Card className="border border-border/80 shadow-xs print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="hidden print:block p-6 border-b mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Urban Furniture
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Accounting & Inventory Management System
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                Stock & Inventory Report
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Generated on:{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <CardHeader className="border-b pb-3 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Inventory Status & Valuation
              </CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredProducts.length} of {products.length} goods
                items
              </CardDescription>
            </div>
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
                filteredProducts.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
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
                ))
              )}
            </TableBody>
            <TableFooter className="bg-muted/40 font-semibold border-t">
              <TableRow className="hover:bg-muted/40">
                <TableCell colSpan={6} className="text-foreground font-bold">
                  Total Valuation ({filteredProducts.length} items)
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
        </CardContent>
      </Card>
    </div>
  );
}
