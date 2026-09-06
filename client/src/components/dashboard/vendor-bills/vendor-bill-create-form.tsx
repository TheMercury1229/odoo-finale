"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  ShoppingCart,
  X,
} from "lucide-react";

import { usePurchaseOrder } from "@/components/dashboard/purchase-orders/purchase-orders-hooks";
import { createVendorBill } from "./vendor-bills-api";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createBillFormSchema = z.object({
  vendorReference: z.string().optional(),
  invoiceDate: z
    .string()
    .min(1, "Bill date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof createBillFormSchema>;

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function VendorBillCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchaseOrderId");
  const { canCreateTransaction } = useUserPermissions();

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Today's date YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createBillFormSchema) as any,
    defaultValues: {
      vendorReference: "",
      invoiceDate: today,
      dueDate: "",
    },
  });

  const {
    data: po,
    isLoading: isLoadingPo,
    isError: isErrorPo,
  } = usePurchaseOrder(purchaseOrderId || "");

  // Missing purchaseOrderId check
  if (!purchaseOrderId) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              No Purchase Order Specified
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Vendor bills must be created from a confirmed purchase order.
              Please select a confirmed purchase order to create its bill.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/purchase-orders" />}
              className="mt-2"
            >
              <ShoppingCart className="mr-2 size-4" />
              Go to Purchase Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading PO state
  if (isLoadingPo) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Error loading PO or PO not found
  if (isErrorPo || !po) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Purchase Order Not Found
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              The purchase order could not be located or you may not have
              permission to view it.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/purchase-orders" />}
              className="mt-2"
            >
              Back to Purchase Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PO must be confirmed
  if (po.status !== "confirmed") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Purchase Order Not Confirmed
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Purchase Order{" "}
              <span className="font-semibold text-foreground">
                {po.poNumber}
              </span>{" "}
              is currently in{" "}
              <span className="capitalize font-semibold text-foreground">
                {po.status}
              </span>{" "}
              status. Purchase orders must be confirmed before creating a vendor
              bill.
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/purchase-orders/${po.id}`} />}
              >
                Open Purchase Order
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/purchase-orders" />}
              >
                All Purchase Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PO already has a bill
  if (po.hasBill) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-border">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <FileText className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Bill Already Created
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              A vendor bill has already been created for Purchase Order{" "}
              <span className="font-semibold text-foreground">
                {po.poNumber}
              </span>
              . Only one bill can be created per purchase order.
            </p>
            <div className="flex gap-3 mt-2">
              {po.billId && (
                <Button
                  nativeButton={false}
                  render={<Link href={`/vendor-bills/${po.billId}`} />}
                >
                  View Existing Bill
                </Button>
              )}
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/vendor-bills" />}
              >
                All Vendor Bills
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle bill confirmation submit
  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setApiError(null);

      const created = await createVendorBill({
        purchaseOrderId: po.id,
        vendorReference: values.vendorReference
          ? values.vendorReference.trim()
          : null,
        invoiceDate: values.invoiceDate,
        dueDate:
          values.dueDate && values.dueDate.trim()
            ? values.dueDate.trim()
            : null,
      });

      router.push(`/vendor-bills/${created.id}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create vendor bill";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-6 pb-16">
      {/* ─── Top Bar Actions (Per Mockup) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        {/* Left Action Group */}
        <div className="flex items-center gap-2">
          {canCreateTransaction && (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              <Check className="mr-1.5 size-4" />
              {isSubmitting ? "Confirming..." : "Confirm"}
            </Button>
          )}
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/purchase-orders/${po.id}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* ─── Inline API Error Alert ─── */}
      {apiError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm font-medium">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-destructive/70 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ─── Main Bill Creation Card ─── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Vendor Bill
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Creating bill from Purchase Order{" "}
                <Link
                  href={`/purchase-orders/${po.id}`}
                  className="font-semibold text-primary underline"
                >
                  {po.poNumber}
                </Link>
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          {/* ─── Header Fields per Mockup ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 pb-2">
            {/* Left Column: Bill No & Vendor Name */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label className="font-semibold text-foreground">
                  Vendor Bill No.
                </Label>
                <Input
                  value="(auto-generate Bill number +1 of Last Bill)"
                  disabled
                  className="bg-muted/50 font-mono text-muted-foreground text-sm font-medium"
                />
                <span className="text-[11px] text-muted-foreground">
                  Sequential internal number generated on confirm (e.g.
                  Bill/2026/0001)
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="font-semibold text-foreground">
                  Vendor Name
                </Label>
                <Input
                  value={po.vendorName || po.vendor?.name || "—"}
                  disabled
                  className="bg-muted/50 font-semibold text-foreground"
                />
                <span className="text-[11px] text-muted-foreground">
                  Fetched directly from Purchase Order {po.poNumber}
                </span>
              </div>
            </div>

            {/* Right Column: Bill Reference, Bill Date, Due Date */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="vendorReference"
                  className="font-semibold text-foreground"
                >
                  Bill Reference (Optional)
                </Label>
                <Input
                  id="vendorReference"
                  placeholder="e.g. ABC-26-001 (Vendor's invoice ref)"
                  {...register("vendorReference")}
                />
                <span className="text-[11px] text-muted-foreground">
                  Vendor's own invoice / bill number from paperwork
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="invoiceDate"
                    className="font-semibold text-foreground"
                  >
                    Bill Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    {...register("invoiceDate")}
                  />
                  {errors.invoiceDate && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.invoiceDate.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="dueDate"
                    className="font-semibold text-foreground"
                  >
                    Due Date
                  </Label>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Line Items Table (READ-ONLY from PO) ─── */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Bill Line Items (Copied from PO)
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded">
                Read-only from PO {po.poNumber}
              </span>
            </div>

            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-16 text-center font-semibold">
                      Sr. No.
                    </TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="w-48 font-semibold">
                      Chart of Account
                    </TableHead>
                    <TableHead className="w-28 text-right font-semibold">
                      Qty
                    </TableHead>
                    <TableHead className="w-36 text-right font-semibold">
                      Unit Price
                    </TableHead>
                    <TableHead className="w-36 text-right font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.lines?.map((line, index) => {
                    const qty = Number(line.quantity) || 0;
                    const price = Number(line.unitPrice) || 0;
                    const subtotal = Math.round(qty * price * 100) / 100;

                    return (
                      <TableRow
                        key={line.id || index}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="text-center font-mono font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {line.productName || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                            Purchase Expense
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-foreground">
                          {qty}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-foreground">
                          {formatCurrency(price)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatCurrency(subtotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ─── Bottom Total Row ─── */}
            <div className="flex justify-end pt-3">
              <div className="flex items-center gap-6 rounded-lg border bg-muted/30 px-6 py-3">
                <span className="text-base font-bold text-foreground tracking-wide">
                  Total
                </span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(po.total)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
