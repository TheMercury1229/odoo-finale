"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useVendorBill } from "@/components/dashboard/vendor-bills/vendor-bills-hooks";
import { PaymentForm } from "@/components/dashboard/payments/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function VendorBillPayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const billId = params.id;

  const { data: bill, isLoading, isError } = useVendorBill(billId);

  useEffect(() => {
    if (bill && bill.amountDue <= 0) {
      router.replace(`/vendor-bills/${bill.id}`);
    }
  }, [bill, router]);

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
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Unable to load vendor bill for payment.
            <div className="mt-4">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/vendor-bills" />}
              >
                Back to Vendor Bills
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bill.amountDue <= 0) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">
              Bill Fully Paid
            </h2>
            <p className="text-sm text-muted-foreground">
              Vendor bill {bill.billNumber} has an amount due of Rs. 0.00 and is fully paid.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/vendor-bills/${bill.id}`} />}
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
      targetData={{
        number: bill.billNumber,
        partnerName: bill.vendorName || bill.vendor?.name || "Vendor",
        totalAmount: bill.totalAmount,
        amountDue: bill.amountDue,
        backUrl: `/vendor-bills/${bill.id}`,
      }}
    />
  );
}
