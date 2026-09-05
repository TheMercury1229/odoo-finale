"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useCustomerInvoice } from "@/components/dashboard/customer-invoices/customer-invoices-hooks";
import { PaymentForm } from "@/components/dashboard/payments/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function CustomerInvoicePayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const { data: invoice, isLoading, isError } = useCustomerInvoice(invoiceId);

  useEffect(() => {
    if (invoice && invoice.amountDue <= 0) {
      router.replace(`/customer-invoices/${invoice.id}`);
    }
  }, [invoice, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Unable to load customer invoice for payment.
            <div className="mt-4">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/customer-invoices" />}
              >
                Back to Customer Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice.amountDue <= 0) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">
              Invoice Fully Paid
            </h2>
            <p className="text-sm text-muted-foreground">
              Customer invoice {invoice.invoiceNumber} has an amount due of Rs. 0.00 and is fully paid.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/customer-invoices/${invoice.id}`} />}
              className="mt-2"
            >
              View Invoice Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PaymentForm
      targetType="customer_invoice"
      targetId={invoice.id}
      targetData={{
        number: invoice.invoiceNumber,
        partnerName: invoice.customerName || invoice.customer?.name || "Customer",
        totalAmount: invoice.totalAmount,
        amountDue: invoice.amountDue,
        backUrl: `/customer-invoices/${invoice.id}`,
      }}
    />
  );
}
