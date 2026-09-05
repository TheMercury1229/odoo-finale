"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, FileText, Printer } from "lucide-react";

import { usePortalInvoice } from "@/components/portal/portal-hooks";
import { getPortalStatusBadge } from "@/app/(portal)/portal/bills/page";
import { triggerPrint } from "@/lib/print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PortalInvoiceDetailPage() {
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
              The invoice you are looking for could not be found or you do not have permission to view it.
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

  const lines = invoice.lines || [];
  const payments = invoice.payments || [];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 max-w-5xl mx-auto pb-16">
      {/* ─── Top Bar Actions ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          {invoice.amountDue > 0 && (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => router.push(`/portal/invoices/${invoice.id}/pay`)}
            >
              <CreditCard className="mr-1.5 size-4" />
              Pay Now ({formatCurrency(invoice.amountDue)})
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              triggerPrint({
                title: `Invoice - ${invoice.invoiceNumber}`,
              })
            }
            className="text-foreground"
          >
            <Printer className="mr-1.5 size-4" />
            Print Invoice
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/portal/invoices")}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back to My Invoices
        </Button>
      </div>

      {/* ─── Main Invoice View Card ─── */}
      <Card className="border border-border/80 shadow-xs print:shadow-none print:border-none">
        {/* Printable Header with Brand */}
        <div className="hidden print:block p-8 border-b pb-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Urban Furniture
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Customer Portal — Invoice Statement
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                Customer Invoice
              </h2>
              <p className="font-mono text-sm font-semibold text-gray-700 mt-0.5">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>
        </div>

        <CardHeader className="pb-6 border-b border-border/60 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {invoice.invoiceNumber}
                </h1>
                {getPortalStatusBadge(invoice.status)}
              </div>
              {invoice.soNumber && (
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  Sales Order: {invoice.soNumber}
                </p>
              )}
            </div>

            {/* Balances summary box */}
            <div className="flex items-center gap-6 rounded-lg border bg-muted/40 px-4 py-2.5">
              <div>
                <div className="text-xs text-muted-foreground">Total Amount</div>
                <div className="text-base font-mono font-bold text-foreground">
                  {formatCurrency(invoice.totalAmount)}
                </div>
              </div>
              <div className="border-l pl-4">
                <div className="text-xs text-muted-foreground">Amount Paid</div>
                <div className="text-base font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(invoice.amountPaid)}
                </div>
              </div>
              <div className="border-l pl-4">
                <div className="text-xs text-muted-foreground">Amount Due</div>
                <div className="text-base font-mono font-bold text-primary">
                  {formatCurrency(invoice.amountDue)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-8">
          {/* ─── Invoice Metadata ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/20 border">
            <div>
              <Label className="text-xs text-muted-foreground">Invoice Date</Label>
              <div className="text-sm font-medium text-foreground mt-0.5">
                {formatDate(invoice.invoiceDate)}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <div className="text-sm font-medium text-foreground mt-0.5">
                {formatDate(invoice.dueDate)}
              </div>
            </div>
            {invoice.soNumber && (
              <div>
                <Label className="text-xs text-muted-foreground">Sales Order</Label>
                <div className="text-sm font-mono font-medium text-foreground mt-0.5">
                  {invoice.soNumber}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="mt-1">{getPortalStatusBadge(invoice.status)}</div>
            </div>
          </div>

          {/* ─── Line Items (Read-only) ─── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Line Items
            </h3>
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="text-right font-semibold w-20">
                      Qty
                    </TableHead>
                    <TableHead className="text-right font-semibold w-28">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right font-semibold w-28">
                      Tax
                    </TableHead>
                    <TableHead className="text-right font-semibold w-32">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        No itemized lines available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="font-medium text-foreground">
                          {item.productName || item.product || "Product"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(item.taxAmount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ─── Payment History (Read-only) ─── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Payment History
            </h3>
            {payments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No payments have been recorded for this invoice yet.
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Payment No.</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Method</TableHead>
                      <TableHead className="text-right font-semibold">
                        Amount Paid
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium text-foreground">
                          {p.paymentNumber || "Payment"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(p.date)}
                        </TableCell>
                        <TableCell className="capitalize font-medium">
                          {p.method}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
