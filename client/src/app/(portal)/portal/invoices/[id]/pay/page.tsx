"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { usePortalInvoice } from "@/components/portal/portal-hooks";
import { PaymentForm } from "@/components/dashboard/payments/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PortalInvoicePayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError } = usePortalInvoice(
    params?.id || "",
  );

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
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              Invoice Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              The invoice you are attempting to pay could not be found or you do not have permission to access it.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/portal/invoices")}
            >
              <ArrowLeft className="mr-1.5 size-4" />
              Back to My Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already fully paid check
  if (invoice.amountDue <= 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-border">
          <CardContent className="pt-8 pb-8 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Invoice Already Paid
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Invoice <span className="font-mono font-bold">{invoice.invoiceNumber}</span> has no remaining balance due.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/portal/invoices/${invoice.id}`} />}
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
      targetNumber={invoice.invoiceNumber}
      partnerName="Urban Furniture"
      totalAmount={invoice.totalAmount}
      amountDue={invoice.amountDue}
      backUrl={`/portal/invoices/${invoice.id}`}
      variant="portal"
    />
  );
}
