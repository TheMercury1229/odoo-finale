"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FilePlus,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { authClient } from "@/lib/auth";
import { fetchContacts } from "@/components/dashboard/contacts/contacts-api";
import {
  fetchProducts,
  type Product,
} from "@/components/dashboard/products/products-api";
import {
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  type SalesOrder,
  type SalesOrderStatus,
} from "./sales-orders-api";
import { getSalesOrderStatusBadge } from "./sales-orders-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const lineSchema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  taxAmount: z.coerce.number().min(0, "Tax amount cannot be negative").default(0),
});

const salesOrderSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  orderDate: z
    .string()
    .min(1, "Order date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  lines: z.array(lineSchema).min(1, "At least 1 line item is required"),
});

type FormValues = z.infer<typeof salesOrderSchema>;

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface SalesOrderFormProps {
  initialSo?: SalesOrder;
}

export function SalesOrderForm({ initialSo }: SalesOrderFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = session?.user.role;
  const canCreate = role === "admin" || role === "accountant";

  const isExisting = Boolean(initialSo?.id);
  const status: SalesOrderStatus = initialSo?.status || "draft";
  const isReadOnly = status !== "draft" || !canCreate;

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Per-row Tax Mode: "%" vs "₹", and stored percentage rate
  const [taxModes, setTaxModes] = useState<Record<number, "%" | "₹">>({});
  const [taxRates, setTaxRates] = useState<Record<number, number>>({});

  const today = new Date().toISOString().split("T")[0];

  const defaultLines = useMemo(() => {
    if (initialSo?.lines && initialSo.lines.length > 0) {
      return initialSo.lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxAmount: Number(l.taxAmount || 0),
      }));
    }
    return [{ productId: "", quantity: 1, unitPrice: 0, taxAmount: 0 }];
  }, [initialSo]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(salesOrderSchema) as any,
    defaultValues: {
      customerId: initialSo?.customerId || "",
      orderDate: initialSo?.orderDate || today,
      lines: defaultLines,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // Contacts query (filtered to customer or both)
  const { data: contactsResult, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", "unarchived"],
    queryFn: () => fetchContacts({ includeArchived: false, view: "list" }),
  });
  const contacts =
    contactsResult && "contacts" in contactsResult ? contactsResult.contacts : [];

  const customers = useMemo(() => {
    return contacts.filter(
      (c) =>
        !c.isArchived &&
        (c.type === "customer" ||
          c.type === "both" ||
          c.id === initialSo?.customerId),
    );
  }, [contacts, initialSo?.customerId]);

  // Products query
  const { data: productsResult, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "unarchived"],
    queryFn: () => fetchProducts({ includeArchived: false, view: "list" }),
  });
  const products =
    productsResult && "products" in productsResult ? productsResult.products : [];

  const unarchivedProducts = useMemo(() => {
    return products.filter((p) => !p.isArchived);
  }, [products]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Watch lines for real-time total calculations
  const watchedLines = useWatch({
    control,
    name: "lines",
    defaultValue: defaultLines,
  });

  // Calculate live subtotal, totalTax, and grandTotal
  const { subtotal, totalTax, grandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    (watchedLines || []).forEach((line) => {
      const q = Number(line?.quantity) || 0;
      const p = Number(line?.unitPrice) || 0;
      const t = Number(line?.taxAmount) || 0;
      sub += Math.round(q * p * 100) / 100;
      tax += Math.round(t * 100) / 100;
    });
    sub = Math.round(sub * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    return {
      subtotal: sub,
      totalTax: tax,
      grandTotal: Math.round((sub + tax) * 100) / 100,
    };
  }, [watchedLines]);

  // Handle product select: prefill salesPrice (sell side!)
  const handleProductSelect = (index: number, productId: string) => {
    setValue(`lines.${index}.productId`, productId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    const prod = productMap.get(productId);
    if (prod && typeof prod.salesPrice !== "undefined") {
      const price = parseFloat(String(prod.salesPrice)) || 0;
      setValue(`lines.${index}.unitPrice`, price, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Recalculate tax if in "%" mode
      const currentMode = taxModes[index] ?? "%";
      if (currentMode === "%") {
        const rate = taxRates[index] ?? 0;
        const currentQty = Number(watchedLines[index]?.quantity) || 1;
        const computedTax = Math.round(currentQty * price * (rate / 100) * 100) / 100;
        setValue(`lines.${index}.taxAmount`, computedTax, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  // Recalculate tax when quantity or unit price changes in "%" mode
  const handleQtyOrPriceChange = (
    index: number,
    field: "quantity" | "unitPrice",
    val: number,
  ) => {
    setValue(`lines.${index}.${field}`, val, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });

    const currentMode = taxModes[index] ?? "%";
    if (currentMode === "%") {
      const rate = taxRates[index] ?? 0;
      const currentQty =
        field === "quantity" ? val : Number(watchedLines[index]?.quantity) || 0;
      const currentPrice =
        field === "unitPrice" ? val : Number(watchedLines[index]?.unitPrice) || 0;
      const computedTax =
        Math.round(currentQty * currentPrice * (rate / 100) * 100) / 100;
      setValue(`lines.${index}.taxAmount`, computedTax, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Handle Tax Rate / Percentage input
  const handleTaxRateChange = (index: number, rate: number) => {
    const clamped = Math.max(0, Math.min(100, rate));
    setTaxRates((prev) => ({ ...prev, [index]: clamped }));
    const currentQty = Number(watchedLines[index]?.quantity) || 0;
    const currentPrice = Number(watchedLines[index]?.unitPrice) || 0;
    const computedTax =
      Math.round(currentQty * currentPrice * (clamped / 100) * 100) / 100;
    setValue(`lines.${index}.taxAmount`, computedTax, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  // Toggle mode "%" vs "₹"
  const toggleTaxMode = (index: number) => {
    const current = taxModes[index] ?? "%";
    const next = current === "%" ? "₹" : "%";
    setTaxModes((prev) => ({ ...prev, [index]: next }));

    if (next === "%") {
      // Recompute based on current taxRate
      const rate = taxRates[index] ?? 0;
      const currentQty = Number(watchedLines[index]?.quantity) || 0;
      const currentPrice = Number(watchedLines[index]?.unitPrice) || 0;
      const computedTax =
        Math.round(currentQty * currentPrice * (rate / 100) * 100) / 100;
      setValue(`lines.${index}.taxAmount`, computedTax, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Form Submission (Create or Update)
  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return;
    try {
      setApiError(null);
      setIsSubmitting(true);

      const payload = {
        customerId: data.customerId,
        orderDate: data.orderDate,
        lines: data.lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxAmount: Number(l.taxAmount || 0),
        })),
      };

      if (isExisting && initialSo) {
        await updateSalesOrder(initialSo.id, payload as any);
        router.refresh();
      } else {
        const created = await createSalesOrder(payload);
        router.push(`/sales-orders/${created.id}`);
      }
    } catch (err: any) {
      setApiError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to save sales order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm SO Handler
  const handleConfirm = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!initialSo || isSubmitting) return;
    try {
      setApiError(null);
      setIsSubmitting(true);
      await confirmSalesOrder(initialSo.id);
      setConfirmDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setApiError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to confirm sales order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel SO Handler
  const handleCancel = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!initialSo || isSubmitting) return;
    try {
      setApiError(null);
      setIsSubmitting(true);
      await cancelSalesOrder(initialSo.id);
      setCancelDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setApiError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to cancel sales order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* ─── Top Bar Actions ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isExisting) {
                  router.push("/sales-orders/new");
                } else {
                  window.location.reload();
                }
              }}
              disabled={isSubmitting}
            >
              <Plus className="mr-1.5 size-4" />
              New
            </Button>
          )}

          {/* Confirm Button: Only for draft */}
          {!isReadOnly && isExisting && canCreate && (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={isSubmitting}
            >
              <Check className="mr-1.5 size-4" />
              Confirm
            </Button>
          )}

          {/* Save Button for Draft */}
          {!isReadOnly && canCreate && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isExisting
                  ? "Save Changes"
                  : "Save Draft"}
            </Button>
          )}

          {/* Generate Invoice: only when confirmed and no invoice exists yet */}
          {status === "confirmed" && !initialSo?.hasInvoice && canCreate && (
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() =>
                router.push(
                  `/customer-invoices/new?salesOrderId=${initialSo?.id}`,
                )
              }
              disabled={isSubmitting}
            >
              <FilePlus className="mr-1.5 size-4" />
              Generate Invoice
            </Button>
          )}

          {/* If invoice already exists, show link */}
          {status === "confirmed" && initialSo?.hasInvoice && (
            <Button
              type="button"
              variant="outline"
              className="border-emerald-600 text-emerald-700 dark:text-emerald-400"
              onClick={() =>
                router.push(`/customer-invoices/${initialSo.invoiceId}`)
              }
              disabled={isSubmitting}
            >
              <FileText className="mr-1.5 size-4" />
              View Customer Invoice
            </Button>
          )}

          {/* Cancel Button */}
          {status !== "cancelled" && isExisting && canCreate && !initialSo?.hasInvoice && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isSubmitting}
            >
              <X className="mr-1.5 size-4" />
              Cancel Order
            </Button>
          )}
        </div>

        {/* Right Navigation / Back */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/sales-orders")}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Sales Orders
          </Button>
        </div>
      </div>

      {/* ─── Inline API Error ─── */}
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
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-bold tracking-tight font-mono">
                  {initialSo?.soNumber || "New Sales Order"}
                </CardTitle>
                {getSalesOrderStatusBadge(status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isExisting
                  ? `Sales Order created on ${initialSo?.orderDate || today}`
                  : "Create a new sales order with line items & flat or percentage taxes"}
              </p>
            </div>

            {/* Total Balance Preview in Header */}
            <div className="text-right bg-muted/30 rounded-lg px-4 py-2 border">
              <div className="text-xs text-muted-foreground">Grand Total</div>
              <div className="text-lg font-mono font-bold text-primary">
                {formatCurrency(grandTotal)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* Header Information: Customer & Order Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Select */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="customerId" className="font-semibold text-foreground">
                  Customer <span className="text-destructive">*</span>
                </Label>
                {isReadOnly ? (
                  <Input
                    value={initialSo?.customerName || initialSo?.customer?.name || "—"}
                    disabled
                    className="bg-muted/50 font-medium"
                  />
                ) : (
                  <Controller
                    control={control}
                    name="customerId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingContacts}
                      >
                        <SelectTrigger id="customerId" className="w-full">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.customerId && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.customerId.message}
                  </p>
                )}
              </div>

              {/* Order Date */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="orderDate" className="font-semibold text-foreground">
                  Order Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="orderDate"
                  type="date"
                  disabled={isReadOnly}
                  {...register("orderDate")}
                  className={isReadOnly ? "bg-muted/50" : ""}
                />
                {errors.orderDate && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.orderDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* ─── Line Items Section ─── */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Order Line Items
                </h3>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        productId: "",
                        quantity: 1,
                        unitPrice: 0,
                        taxAmount: 0,
                      })
                    }
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add line
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-48 font-semibold">
                        Product
                      </TableHead>
                      <TableHead className="w-24 text-right font-semibold">
                        Qty
                      </TableHead>
                      <TableHead className="w-32 text-right font-semibold">
                        Unit Price
                      </TableHead>
                      <TableHead className="w-56 text-right font-semibold">
                        Tax
                      </TableHead>
                      <TableHead className="w-36 text-right font-semibold">
                        Total
                      </TableHead>
                      {!isReadOnly && <TableHead className="w-12 text-center" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const currentLine = watchedLines[index] || {};
                      const qty = Number(currentLine.quantity) || 0;
                      const price = Number(currentLine.unitPrice) || 0;
                      const tax = Number(currentLine.taxAmount) || 0;
                      const lineSubtotal = Math.round(qty * price * 100) / 100;
                      const lineTotal = Math.round((lineSubtotal + tax) * 100) / 100;
                      const currentMode = taxModes[index] ?? "%";

                      return (
                        <TableRow key={field.id} className="align-top">
                          <TableCell className="text-center font-mono text-muted-foreground pt-4">
                            {index + 1}
                          </TableCell>

                          {/* Product Select */}
                          <TableCell className="pt-2">
                            {isReadOnly ? (
                              <div className="font-medium text-foreground py-2">
                                {currentLine.productId
                                  ? productMap.get(currentLine.productId)?.name ||
                                    currentLine.productId
                                  : "—"}
                              </div>
                            ) : (
                              <Controller
                                control={control}
                                name={`lines.${index}.productId`}
                                render={({ field: productField }) => (
                                  <Select
                                    value={productField.value}
                                    onValueChange={(val) => {
                                      if (val) handleProductSelect(index, val);
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {unarchivedProducts.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} (Sell: Rs. {p.salesPrice})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            )}
                            {errors.lines?.[index]?.productId && (
                              <p className="text-[11px] text-destructive mt-1 font-medium">
                                {errors.lines[index]?.productId?.message}
                              </p>
                            )}
                          </TableCell>

                          {/* Quantity */}
                          <TableCell className="pt-2">
                            {isReadOnly ? (
                              <div className="text-right font-mono py-2">
                                {qty}
                              </div>
                            ) : (
                              <Controller
                                control={control}
                                name={`lines.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="1"
                                    value={qtyField.value}
                                    onChange={(e) =>
                                      handleQtyOrPriceChange(
                                        index,
                                        "quantity",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="text-right font-mono"
                                  />
                                )}
                              />
                            )}
                            {errors.lines?.[index]?.quantity && (
                              <p className="text-[11px] text-destructive mt-1 font-medium text-right">
                                {errors.lines[index]?.quantity?.message}
                              </p>
                            )}
                          </TableCell>

                          {/* Unit Price */}
                          <TableCell className="pt-2">
                            {isReadOnly ? (
                              <div className="text-right font-mono py-2">
                                {formatCurrency(price)}
                              </div>
                            ) : (
                              <Controller
                                control={control}
                                name={`lines.${index}.unitPrice`}
                                render={({ field: priceField }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={priceField.value}
                                    onChange={(e) =>
                                      handleQtyOrPriceChange(
                                        index,
                                        "unitPrice",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="text-right font-mono"
                                  />
                                )}
                              />
                            )}
                            {errors.lines?.[index]?.unitPrice && (
                              <p className="text-[11px] text-destructive mt-1 font-medium text-right">
                                {errors.lines[index]?.unitPrice?.message}
                              </p>
                            )}
                          </TableCell>

                          {/* ─── Tax Input with % / ₹ Toggle ─── */}
                          <TableCell className="pt-2">
                            {isReadOnly ? (
                              <div className="text-right font-mono py-2">
                                {formatCurrency(tax)}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 w-full justify-end">
                                  {/* Mode toggle button */}
                                  <button
                                    type="button"
                                    onClick={() => toggleTaxMode(index)}
                                    title={`Current mode: ${currentMode}. Click to switch to ${
                                      currentMode === "%" ? "₹ (Amount)" : "% (Rate)"
                                    }`}
                                    className="px-2 py-1 text-xs font-bold rounded border bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0"
                                  >
                                    {currentMode}
                                  </button>

                                  {/* In % mode */}
                                  {currentMode === "%" ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      placeholder="Tax %"
                                      value={taxRates[index] ?? ""}
                                      onChange={(e) =>
                                        handleTaxRateChange(
                                          index,
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                      className="text-right font-mono w-24"
                                    />
                                  ) : (
                                    /* In ₹ mode */
                                    <Controller
                                      control={control}
                                      name={`lines.${index}.taxAmount`}
                                      render={({ field: taxField }) => (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="Tax Rs."
                                          value={taxField.value}
                                          onChange={(e) =>
                                            setValue(
                                              `lines.${index}.taxAmount`,
                                              parseFloat(e.target.value) || 0,
                                              {
                                                shouldValidate: true,
                                                shouldDirty: true,
                                              },
                                            )
                                          }
                                          className="text-right font-mono w-28"
                                        />
                                      )}
                                    />
                                  )}
                                </div>

                                {/* Read-only helper text showing computed tax in % mode */}
                                {currentMode === "%" && (
                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    = {formatCurrency(tax)}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          {/* Row Total */}
                          <TableCell className="text-right font-mono font-semibold text-foreground pt-4">
                            {formatCurrency(lineTotal)}
                          </TableCell>

                          {/* Remove row button */}
                          {!isReadOnly && (
                            <TableCell className="text-center pt-2">
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ─── Bottom Summary Box ─── */}
            <div className="flex flex-col items-end gap-2 pt-4 border-t border-border/60">
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
                  <span className="text-foreground">Grand Total:</span>
                  <span className="font-mono text-primary text-lg">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Confirm Dialog ─── */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sales Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirming this sales order will freeze all line items and
              pricing. Once confirmed, you can generate a Customer Invoice
              against it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSubmitting ? "Confirming..." : "Confirm Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Cancel Dialog ─── */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Sales Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel sales order {initialSo?.soNumber}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              {isSubmitting ? "Cancelling..." : "Yes, Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
