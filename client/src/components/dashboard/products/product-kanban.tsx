import Link from "next/link";
import { Archive, Package } from "lucide-react";

import type { Product } from "@/components/dashboard/products/products-api";
import {
  productTypeLabels,
  formatPrice,
} from "@/components/dashboard/products/product-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductKanbanProps {
  products: Product[];
}

export function ProductKanban({ products }: ProductKanbanProps) {
  const groups = (["goods", "service", "combo"] as const).map((type) => ({
    type,
    title: productTypeLabels[type],
    products: products.filter((product) => product.type === type),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((group) => (
        <section
          key={group.type}
          className="min-w-0 rounded-xl border border-border/50 bg-muted/30 p-3"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <Badge variant="secondary" className="text-xs">
              {group.products.length}
            </Badge>
          </div>

          {group.products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/40 py-8 text-center">
              <Package className="size-5 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                No {group.title.toLowerCase()} products
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {group.products.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="transition-shadow hover:shadow-md hover:bg-muted/60">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="size-5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <CardTitle className="truncate">
                          {product.name}
                        </CardTitle>
                        {product.isArchived ? (
                          <Badge
                            variant="destructive"
                            className="mt-1 w-fit gap-1 text-[10px] leading-none"
                          >
                            <Archive className="size-2.5" />
                            Archived
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Sales Price</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {formatPrice(product.salesPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cost</span>
                        <span className="tabular-nums">
                          {formatPrice(product.costPrice)}
                        </span>
                      </div>
                      {product.category ? (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
