"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Printer, Search } from "lucide-react";
import { useState } from "react";

import { usePortalInvoices } from "@/components/portal/portal-hooks";
import { getPortalStatusBadge } from "@/app/(portal)/portal/bills/page";
import { triggerPrint } from "@/lib/print";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PortalInvoicesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const { data: invoices = [], isLoading, isError } = usePortalInvoices();

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchInput.trim()) return true;
    const term = searchInput.toLowerCase().trim();
    return inv.invoiceNumber.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View all customer invoices and track payment status.
          </p>
        </div>
      </div>

      {/* ─── Printable Header (Only Visible in Print) ─── */}

      {/* ─── Content ─── */}
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 pb-6 text-center text-sm text-destructive">
            Unable to load your invoices at this time. Please try again later.
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="pt-12 pb-12 text-center flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <FileText className="size-8" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              {invoices.length === 0
                ? "You have no invoices."
                : "No matching invoices found."}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {invoices.length === 0
                ? "When customer invoices are generated for your sales orders, they will appear here."
                : "Try adjusting your search criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Invoice No.</TableHead>
                <TableHead className="font-semibold">Invoice Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Amount Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  onClick={() => router.push(`/portal/invoices/${invoice.id}`)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium font-mono text-primary">
                    <Link
                      href={`/portal/invoices/${invoice.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(invoice.invoiceDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                  <TableCell>{getPortalStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCurrency(invoice.amountDue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
