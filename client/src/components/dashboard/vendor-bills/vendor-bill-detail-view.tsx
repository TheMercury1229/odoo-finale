"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  FileText,
  Printer,
  ShoppingCart,
} from "lucide-react";

import { type VendorBill } from "./vendor-bills-api";
import { getBillStatusBadge } from "./vendor-bills-view";
import { triggerPrint } from "@/lib/print";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface VendorBillDetailViewProps {
  bill: VendorBill;
}

export function VendorBillDetailView({ bill }: VendorBillDetailViewProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { canRecordPayment } = useUserPermissions();

  // Payment breakdown grouped by method
  const payments = bill.payments || [];
  const paidViaCash = payments
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const paidViaBank = payments
    .filter((p) => p.method === "bank")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const handlePrint = () => {
    triggerPrint({
      title: `Vendor Bill - ${bill.billNumber}`,
    });
  };

  const handlePay = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(`/vendor-bills/${bill.id}/pay`);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* ─── Top Bar Actions (Screen Only) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4 print:hidden">
        {/* Left Action Group */}
        <div className="flex items-center gap-2">
          {canRecordPayment && bill.amountDue > 0 && (
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
              onClick={handlePay}
              disabled={isNavigating}
            >
              <CreditCard className="mr-1.5 size-4" />
              {isNavigating ? "Opening..." : "Pay"}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="text-foreground"
          >
            <Printer className="mr-1.5 size-4" />
            Print Receipt
          </Button>
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-2">
          {bill.purchaseOrderId && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/purchase-orders/${bill.purchaseOrderId}`} />}
              className="bg-muted/40 font-mono text-xs font-semibold"
            >
              <ShoppingCart className="mr-1.5 size-3.5" />
              PO: {bill.poNumber || "View PO"}
              <ExternalLink className="ml-1 size-3" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/vendor-bills")}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
        </div>
      </div>

      {/* ─── Printable / Main Vendor Bill View Card ─── */}
      <Card className="border border-border/80 shadow-xs print:shadow-none print:border-none">
        {/* Printable Header with Brand */}
        <div className="hidden print:block p-8 border-b pb-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Urban Furniture
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Accounting & Purchasing System
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                Vendor Bill Receipt
              </h2>
              <p className="font-mono text-sm font-semibold text-gray-700 mt-0.5">
                {bill.billNumber}
              </p>
            </div>
          </div>
        </div>

        <CardHeader className="pb-4 border-b border-border/60 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-bold tracking-tight font-mono">
                  {bill.billNumber}
                </CardTitle>
                {getBillStatusBadge(bill.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Linked Purchase Order:{" "}
                {bill.purchaseOrderId ? (
                  <Link
                    href={`/purchase-orders/${bill.purchaseOrderId}`}
                    className="font-medium text-primary underline"
                  >
                    {bill.poNumber || bill.purchaseOrderId}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6 print:p-8">
          {/* ─── Header Information ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 pb-2">
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vendor Bill No.
                </Label>
                <div className="text-lg font-mono font-bold text-foreground mt-0.5">
                  {bill.billNumber}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vendor Name
                </Label>
                <div className="text-base font-semibold text-foreground mt-0.5">
                  {bill.vendorName || bill.vendor?.name || "—"}
                </div>
                {bill.vendor?.email && (
                  <div className="text-xs text-muted-foreground">
                    {bill.vendor.email}
                  </div>
                )}
              </div>

              <div className="print:block">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Status
                </Label>
                <div className="mt-1">{getBillStatusBadge(bill.status)}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bill Reference
                </Label>
                <div className="text-base font-mono font-medium text-foreground mt-0.5">
                  {bill.vendorReference || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Bill Date
                  </Label>
                  <div className="text-sm font-medium text-foreground mt-0.5">
                    {formatDate(bill.invoiceDate)}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </Label>
                  <div className="text-sm font-medium text-foreground mt-0.5">
                    {formatDate(bill.dueDate)}
                  </div>
                </div>
              </div>

              {bill.journalEntryId && (
                <div className="print:hidden">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Journal Entry
                  </Label>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {bill.journalEntryId}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Line Items Table (Read-Only) ─── */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Bill Line Items
            </h3>

            <div className="rounded-lg border border-border/80 overflow-hidden print:border-gray-300">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 print:bg-gray-100">
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
                  {bill.lines?.map((line, index) => (
                    <TableRow key={line.id || index} className="hover:bg-muted/20">
                      <TableCell className="text-center font-mono font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {line.productName || line.productId}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md print:bg-transparent print:p-0 print:text-black">
                          Purchase Expense
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-foreground">
                        {line.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-foreground">
                        {formatCurrency(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {formatCurrency(line.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ─── Bottom Summary Row & Payment Breakdown (Per Mockup) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 items-start">
              {/* Left Column: Payment Records (if any) */}
              <div>
                {payments.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recorded Payments
                    </h4>
                    <div className="rounded-lg border text-xs overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="h-8">Date</TableHead>
                            <TableHead className="h-8">Method</TableHead>
                            <TableHead className="h-8 text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="py-2">{formatDate(p.date)}</TableCell>
                              <TableCell className="py-2 capitalize font-medium">
                                {p.method}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono font-medium">
                                {formatCurrency(p.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic print:hidden">
                    No payments have been recorded for this bill yet.
                  </p>
                )}
              </div>

              {/* Right Column: Bottom-right summary block per mockup */}
              <div className="flex flex-col items-end gap-2">
                {/* Total Row */}
                <div className="flex items-center justify-between w-full max-w-xs border-b pb-2">
                  <span className="text-base font-bold text-foreground tracking-wide">
                    Total
                  </span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {formatCurrency(bill.totalAmount)}
                  </span>
                </div>

                {/* Payment Breakdown Box */}
                <div className="flex flex-col gap-1.5 w-full max-w-xs bg-muted/30 rounded-lg p-3 border text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Paid Via Cash:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(paidViaCash)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Paid Via Bank:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(paidViaBank)}
                    </span>
                  </div>

                  <div className="border-t pt-1.5 mt-0.5 flex justify-between items-center font-bold text-sm">
                    <span className="text-foreground">Amount Due:</span>
                    <span className="font-mono text-primary text-base">
                      {formatCurrency(bill.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Signature Section */}
          <div className="hidden print:flex justify-between pt-16 mt-8 border-t text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Authorized Signature</p>
              <div className="w-48 border-b border-gray-400 mt-10" />
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">Vendor Acknowledgement</p>
              <div className="w-48 border-b border-gray-400 mt-10" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
