"use client";

import { useState } from "react";
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
  ShoppingBag,
  X,
} from "lucide-react";

import { useSalesOrder } from "@/components/dashboard/sales-orders/sales-orders-hooks";
import { createCustomerInvoice } from "./customer-invoices-api";
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

const createInvoiceFormSchema = z.object({
  invoiceDate: z
    .string()
    .min(1, "Invoice date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof createInvoiceFormSchema>;

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CustomerInvoiceCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get("salesOrderId");
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
    resolver: zodResolver(createInvoiceFormSchema) as any,
    defaultValues: {
      invoiceDate: today,
      dueDate: "",
    },
  });

  const {
    data: so,
    isLoading: isLoadingSo,
    isError: isErrorSo,
  } = useSalesOrder(salesOrderId || "");

  // Missing salesOrderId check
  if (!salesOrderId) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              No Sales Order Specified
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Customer invoices must be created from a confirmed sales order.
              Please select a confirmed sales order to generate an invoice.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/sales-orders" />}
              className="mt-2"
            >
              Go to Sales Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingSo) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isErrorSo || !so) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Sales Order Not Found
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Could not find the specified sales order. It may have been removed
              or you lack permission to view it.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/sales-orders" />}
            >
              Back to Sales Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Must be confirmed check
  if (so.status !== "confirmed") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Sales Order Not Confirmed
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Sales Order{" "}
              <span className="font-mono font-bold">{so.soNumber}</span> is
              currently in &quot;{so.status}&quot; status. An invoice can only
              be created once the sales order is confirmed.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/sales-orders/${so.id}`} />}
              className="mt-2"
            >
              View Sales Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already has invoice check
  if (so.hasInvoice) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-border">
          <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <FileText className="size-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Invoice Already Generated
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Sales Order{" "}
              <span className="font-mono font-bold">{so.soNumber}</span> already
              has a customer invoice. Each sales order can only have one
              invoice.
            </p>
            <div className="flex gap-3">
              {so.invoiceId && (
                <Button
                  nativeButton={false}
                  render={<Link href={`/customer-invoices/${so.invoiceId}`} />}
                >
                  View Existing Invoice
                </Button>
              )}
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/sales-orders/${so.id}`} />}
              >
                Back to Sales Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lines = so.lines || [];
  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const totalTax = lines.reduce(
    (sum, l) => sum + (Number(l.taxAmount) || 0),
    0,
  );
  const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return;
    try {
      setApiError(null);
      setIsSubmitting(true);

      const created = await createCustomerInvoice({
        salesOrderId: so.id,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate ? data.dueDate : null,
      });

      router.push(`/customer-invoices/${created.id}`);
    } catch (err: any) {
      setApiError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to create customer invoice",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-6 pb-16">
      {/* ─── Top Bar Actions ─── */}
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
              {isSubmitting ? "Creating Invoice..." : "Confirm & Post"}
            </Button>
          )}
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/sales-orders/${so.id}`)}
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

      {/* ─── Main Form Card ─── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                New Customer Invoice
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Creating customer invoice from Sales Order{" "}
                <Link
                  href={`/sales-orders/${so.id}`}
                  className="font-mono font-semibold text-primary underline"
                >
                  {so.soNumber}
                </Link>
              </p>
            </div>

            {/* Total Balance Preview in Header */}
            <div className="text-right bg-muted/30 rounded-lg px-4 py-2 border">
              <div className="text-xs text-muted-foreground">Invoice Total</div>
              <div className="text-lg font-mono font-bold text-primary">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* Header Fields: Customer, Linked SO, Invoice Date, Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              {/* Left Column */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer Name
                  </Label>
                  <Input
                    value={so.customerName || so.customer?.name || "—"}
                    disabled
                    className="bg-muted/50 font-semibold text-foreground cursor-not-allowed"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Fetched from linked Sales Order
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Linked Sales Order
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${so.soNumber} (Ordered: ${so.orderDate})`}
                      disabled
                      className="bg-muted/50 font-mono text-sm cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`/sales-orders/${so.id}`} target="_blank" />
                      }
                      className="shrink-0"
                    >
                      <ShoppingBag className="mr-1 size-3.5" />
                      View SO
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="invoiceDate"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Invoice Date <span className="text-destructive">*</span>
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

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="dueDate"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Due Date
                  </Label>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                  <span className="text-[11px] text-muted-foreground">
                    Optional payment due date
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Line Items (Read-Only from SO) ─── */}
            <div className="flex flex-col gap-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Invoice Line Items
                </h3>
                <span className="text-xs text-muted-foreground">
                  Read-only: copied from Sales Order
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
                      <TableHead className="w-44 font-semibold">
                        Chart of Account
                      </TableHead>
                      <TableHead className="w-24 text-right font-semibold">
                        Qty
                      </TableHead>
                      <TableHead className="w-32 text-right font-semibold">
                        Unit Price
                      </TableHead>
                      <TableHead className="w-28 text-right font-semibold">
                        Tax
                      </TableHead>
                      <TableHead className="w-36 text-right font-semibold">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => {
                      const qty = Number(line.quantity);
                      const price = Number(line.unitPrice);
                      const tax = Number(line.taxAmount || 0);
                      const lineSubtotal = Math.round(qty * price * 100) / 100;
                      const lineTotal =
                        Math.round((lineSubtotal + tax) * 100) / 100;

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
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                              Sales Income
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-foreground">
                            {qty}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-foreground">
                            {formatCurrency(price)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-foreground">
                            {formatCurrency(tax)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ─── Bottom Summary Box ─── */}
              <div className="flex flex-col items-end gap-2 pt-4">
                <div className="w-full max-w-xs flex flex-col gap-2 bg-muted/20 rounded-lg p-4 border text-sm">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total Tax:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(totalTax)}
                    </span>
                  </div>

                  <div className="border-t pt-2 mt-1 flex justify-between items-center font-bold text-base">
                    <span className="text-foreground">Total Amount:</span>
                    <span className="font-mono text-primary text-lg">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
