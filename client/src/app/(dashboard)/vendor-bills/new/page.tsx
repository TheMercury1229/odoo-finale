import { Suspense } from "react";
import { VendorBillCreateForm } from "@/components/dashboard/vendor-bills/vendor-bill-create-form";
import { Spinner } from "@/components/ui/spinner";

export default function NewVendorBillPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <VendorBillCreateForm />
    </Suspense>
  );
}
