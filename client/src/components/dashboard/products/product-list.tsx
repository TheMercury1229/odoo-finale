import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";

import type { Product } from "@/components/dashboard/products/products-api";
import {
  productTypeLabels,
  formatPrice,
} from "@/components/dashboard/products/product-utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox aria-label="Select all products" />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Sales Price</TableHead>
          <TableHead className="text-right">Cost Price</TableHead>
          <TableHead>Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow
            key={product.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => router.push(`/products/${product.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/products/${product.id}`);
              }
            }}
          >
            <TableCell onClick={(event) => event.stopPropagation()}>
              <Checkbox aria-label={`Select ${product.name}`} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                {product.isArchived ? (
                  <Badge
                    variant="destructive"
                    className="gap-1 text-[10px] leading-none"
                  >
                    <Archive className="size-2.5" />
                    Archived
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs capitalize">
                {productTypeLabels[product.type]}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatPrice(product.salesPrice)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatPrice(product.costPrice)}
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground">
                {product.category || "—"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
