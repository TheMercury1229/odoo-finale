"use client";

import { useParams } from "next/navigation";

import { PurchaseOrderForm } from "@/components/dashboard/purchase-orders/purchase-order-form";
import { usePurchaseOrder } from "@/components/dashboard/purchase-orders/purchase-orders-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PurchaseOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const poQuery = usePurchaseOrder(params.id);

  if (poQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (poQuery.isError || !poQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this purchase order. It may have been removed or you may lack permission.
        </CardContent>
      </Card>
    );
  }

  return <PurchaseOrderForm initialPo={poQuery.data} />;
}
