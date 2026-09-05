"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Columns3, List, Package, Plus, Search } from "lucide-react";

import { ProductKanban } from "@/components/dashboard/products/product-kanban";
import { ProductList } from "@/components/dashboard/products/product-list";
import { useProducts } from "@/components/dashboard/products/products-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type ProductView = "list" | "kanban";

export function ProductsView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProductView>("list");
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const productsQuery = useProducts({ search, includeArchived, view });
  const products =
    productsQuery.data?.view === "list"
      ? productsQuery.data.products
      : productsQuery.data?.groups.flatMap((group) => group.products) || [];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top bar ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button nativeButton={false} render={<Link href="/products/new" />}>
          <Plus data-icon="inline-start" />
          New
        </Button>
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List />
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Kanban view"
            aria-pressed={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            <Columns3 />
          </Button>
        </div>
      </div>

      {/* ─── Heading row ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          {!productsQuery.isPending && products.length > 0 ? (
            <Badge variant="secondary">{products.length}</Badge>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={includeArchived}
          onClick={() => setIncludeArchived((value) => !value)}
        >
          {includeArchived ? "Hide archived" : "Show archived"}
        </Button>
      </div>

      {/* ─── Content ─── */}
      {productsQuery.isPending ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : productsQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Unable to load products. Please try again.
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Package className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? `No products match "${search}".`
                  : "Get started by creating your first product."}
              </p>
            </div>
            {!search ? (
              <Button
                nativeButton={false}
                render={<Link href="/products/new" />}
                className="mt-2"
              >
                <Plus data-icon="inline-start" />
                Create Product
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : view === "list" ? (
        <Card>
          <CardContent className="p-0">
            <ProductList products={products} />
          </CardContent>
        </Card>
      ) : (
        <ProductKanban products={products} />
      )}
    </div>
  );
}
