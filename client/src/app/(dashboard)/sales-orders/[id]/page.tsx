"use client";

import { useParams } from "next/navigation";

import { SalesOrderForm } from "@/components/dashboard/sales-orders/sales-order-form";
import { useSalesOrder } from "@/components/dashboard/sales-orders/sales-orders-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function SalesOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const soQuery = useSalesOrder(params.id);

  if (soQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (soQuery.isError || !soQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this sales order. It may have been removed or you may lack permission.
        </CardContent>
      </Card>
    );
  }

  return <SalesOrderForm initialSo={soQuery.data} />;
}
