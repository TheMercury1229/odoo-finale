"use client";

import { useParams } from "next/navigation";

import { useCustomerInvoice } from "@/components/dashboard/customer-invoices/customer-invoices-hooks";
import { CustomerInvoiceDetailView } from "@/components/dashboard/customer-invoices/customer-invoice-detail-view";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function CustomerInvoiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const invoiceQuery = useCustomerInvoice(params.id);

  if (invoiceQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this customer invoice. It may have been removed or you
          lack permission to view it.
        </CardContent>
      </Card>
    );
  }

  return <CustomerInvoiceDetailView invoice={invoiceQuery.data} />;
}
