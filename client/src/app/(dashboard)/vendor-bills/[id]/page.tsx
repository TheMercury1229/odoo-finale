"use client";

import { useParams } from "next/navigation";

import { VendorBillDetailView } from "@/components/dashboard/vendor-bills/vendor-bill-detail-view";
import { useVendorBill } from "@/components/dashboard/vendor-bills/vendor-bills-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function VendorBillDetailPage() {
  const params = useParams<{ id: string }>();
  const billQuery = useVendorBill(params.id);

  if (billQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (billQuery.isError || !billQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this vendor bill. It may have been removed or you may lack permission.
        </CardContent>
      </Card>
    );
  }

  return <VendorBillDetailView bill={billQuery.data} />;
}
