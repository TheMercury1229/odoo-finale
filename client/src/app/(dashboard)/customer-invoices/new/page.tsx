import { Suspense } from "react";
import { CustomerInvoiceCreateForm } from "@/components/dashboard/customer-invoices/customer-invoice-create-form";
import { Spinner } from "@/components/ui/spinner";

export default function NewCustomerInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CustomerInvoiceCreateForm />
    </Suspense>
  );
}
