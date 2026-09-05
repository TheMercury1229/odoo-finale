"use client";

import { useParams } from "next/navigation";

import { ProductForm } from "@/components/dashboard/products/product-form";
import { useProduct } from "@/components/dashboard/products/products-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productQuery = useProduct(params.id);

  if (productQuery.isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this product.
        </CardContent>
      </Card>
    );
  }

  return <ProductForm product={productQuery.data} />;
}
