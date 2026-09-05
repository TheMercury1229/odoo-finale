"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { usePortalBill } from "@/components/portal/portal-hooks";
import { PaymentForm } from "@/components/dashboard/payments/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PortalBillPayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: bill, isLoading, isError } = usePortalBill(params?.id || "");

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              Bill Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              The bill you are attempting to pay could not be found or you do not have permission to access it.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/portal/bills")}
            >
              <ArrowLeft className="mr-1.5 size-4" />
              Back to My Bills
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already fully paid check
  if (bill.amountDue <= 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-border">
          <CardContent className="pt-8 pb-8 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Bill Already Paid
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Vendor Bill <span className="font-mono font-bold">{bill.billNumber}</span> has no remaining balance due.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/portal/bills/${bill.id}`} />}
              className="mt-2"
            >
              View Bill Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PaymentForm
      targetType="vendor_bill"
      targetId={bill.id}
      targetNumber={bill.billNumber}
      partnerName={bill.vendorReference || "Vendor"}
      totalAmount={bill.totalAmount}
      amountDue={bill.amountDue}
      backUrl={`/portal/bills/${bill.id}`}
      variant="portal"
    />
  );
}
