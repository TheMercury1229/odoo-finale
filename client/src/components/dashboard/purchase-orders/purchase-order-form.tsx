"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
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
import { fetchProducts, type Product } from "@/components/dashboard/products/products-api";
import { fetchAnalyticAccounts } from "@/components/dashboard/analytic-accounts/analytic-accounts-api";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "./purchase-orders-api";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

const lineSchema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  analyticAccountId: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor selection is required"),
  orderDate: z
    .string()
    .min(1, "Order date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  lines: z.array(lineSchema).min(1, "At least 1 line item is required"),
});

type FormValues = z.infer<typeof purchaseOrderSchema>;

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white capitalize px-3 py-1 font-medium">
          Confirmed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className="capitalize px-3 py-1 font-medium">
          Cancelled
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge variant="secondary" className="capitalize px-3 py-1 font-medium">
          Draft
        </Badge>
      );
  }
}

interface PurchaseOrderFormProps {
  initialPo?: PurchaseOrder;
}

export function PurchaseOrderForm({ initialPo }: PurchaseOrderFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = session?.user.role;
  const canCreate = role === "admin" || role === "accountant";

  const isExisting = Boolean(initialPo?.id);
  const status: PurchaseOrderStatus = initialPo?.status || "draft";
  const isReadOnly = status !== "draft" || !canCreate;

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Today's date YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const defaultLines = useMemo(() => {
    if (initialPo?.lines && initialPo.lines.length > 0) {
      return initialPo.lines.map((l) => ({
        productId: l.productId,
        analyticAccountId: l.analyticAccountId || null,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      }));
    }
    return [{ productId: "", analyticAccountId: null, quantity: 1, unitPrice: 0 }];
  }, [initialPo]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(purchaseOrderSchema) as any,
    defaultValues: {
      vendorId: initialPo?.vendorId || "",
      orderDate: initialPo?.orderDate || today,
      lines: defaultLines,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // Query Contacts (filtered to unarchived vendors)
  const { data: contactsResult, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", "unarchived"],
    queryFn: () => fetchContacts({ includeArchived: false, view: "list" }),
  });
  const contacts =
    contactsResult && "contacts" in contactsResult ? contactsResult.contacts : [];

  const vendors = useMemo(() => {
    return contacts.filter(
      (c) =>
        !c.isArchived &&
        (c.type === "vendor" || c.type === "both" || c.id === initialPo?.vendorId),
    );
  }, [contacts, initialPo?.vendorId]);

  // Query Products (filtered to unarchived products)
  const { data: productsResult, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "unarchived"],
    queryFn: () => fetchProducts({ includeArchived: false, view: "list" }),
  });
  const products =
    productsResult && "products" in productsResult ? productsResult.products : [];

  const unarchivedProducts = useMemo(() => {
    return products.filter((p) => !p.isArchived);
  }, [products]);

  // Query Analytic Accounts (expense)
  const { data: analyticAccounts = [] } = useQuery({
    queryKey: ["analytic-accounts", "active"],
    queryFn: () => fetchAnalyticAccounts({ includeArchived: false }),
  });

  const expenseAnalytics = useMemo(() => {
    return analyticAccounts.filter((a) => a.type === "expense");
  }, [analyticAccounts]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Live total computation with useWatch for responsive recalculations
  const watchedLines = useWatch({
    control,
    name: "lines",
    defaultValue: defaultLines,
  });

  const totalAmount = useMemo(() => {
    const sum = (watchedLines || []).reduce((acc, line) => {
      const qty = Number(line?.quantity) || 0;
      const price = Number(line?.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [watchedLines]);

  // Handle product selection: auto-populate unit price with product's costPrice
  const handleProductSelect = (index: number, productId: string) => {
    setValue(`lines.${index}.productId`, productId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    const prod = productMap.get(productId);
    if (prod && typeof prod.costPrice !== "undefined") {
      const cost = parseFloat(String(prod.costPrice)) || 0;
      setValue(`lines.${index}.unitPrice`, cost, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  // Reset / New button handler
  const handleNew = () => {
    if (isExisting) {
      router.push("/purchase-orders/new");
    } else {
      reset({
        vendorId: "",
        orderDate: today,
        lines: [{ productId: "", analyticAccountId: null, quantity: 1, unitPrice: 0 }],
      });
      setApiError(null);
    }
  };

  // Save / Submit handler
  const onSaveDraft = async (values: FormValues) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setApiError(null);

      if (isExisting && initialPo) {
        const updated = await updatePurchaseOrder(initialPo.id, values);
        router.refresh();
        router.push(`/purchase-orders/${updated.id}`);
      } else {
        const created = await createPurchaseOrder(values);
        router.push(`/purchase-orders/${created.id}`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save purchase order";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm PO handler
  const executeConfirm = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setApiError(null);

      let poId = initialPo?.id;

      // If new, save first
      if (!isExisting) {
        let createdId: string | null = null;
        await handleSubmit(async (values) => {
          const created = await createPurchaseOrder(values);
          createdId = created.id;
        })();
        poId = createdId || undefined;
        if (!poId) {
          setIsSubmitting(false);
          return;
        }
      } else if (status === "draft") {
        // Update first before confirming to ensure latest line items are saved
        await handleSubmit(async (values) => {
          await updatePurchaseOrder(initialPo!.id, values);
        })();
      }

      if (poId) {
        await confirmPurchaseOrder(poId);
        setConfirmDialogOpen(false);
        router.refresh();
        router.push(`/purchase-orders/${poId}`);
      }
    } catch (err: any) {
      setConfirmDialogOpen(false);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to confirm purchase order";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel PO handler
  const executeCancel = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!initialPo?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setApiError(null);
      await cancelPurchaseOrder(initialPo.id);
      setCancelDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setCancelDialogOpen(false);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to cancel purchase order";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Bill navigation handler
  const handleCreateBill = () => {
    if (initialPo?.id && !isSubmitting) {
      router.push(`/vendor-bills/new?purchaseOrderId=${initialPo.id}`);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* ─── Top Bar Actions (Per Mockup) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        {/* Left Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button
              type="button"
              variant="outline"
              onClick={handleNew}
              disabled={isSubmitting}
            >
              <Plus className="mr-1.5 size-4" />
              New
            </Button>
          )}

          {status === "draft" && canCreate && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit(onSaveDraft)}
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={isSubmitting}
              >
                <Check className="mr-1.5 size-4" />
                Confirm
              </Button>
            </>
          )}

          {/* "Create Bill": ONLY when confirmed AND no bill exists yet AND authorized */}
          {status === "confirmed" && !initialPo?.hasBill && canCreate && (
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
              onClick={handleCreateBill}
              disabled={isSubmitting}
            >
              <FilePlus className="mr-1.5 size-4" />
              Create Bill
            </Button>
          )}
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-2">
          {/* "Cancel": visible when draft or confirmed AND no bill exists */}
          {(status === "draft" || status === "confirmed") &&
            !initialPo?.hasBill &&
            canCreate &&
            isExisting && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/purchase-orders")}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
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
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {isExisting ? initialPo?.poNumber : "Purchase Order"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isExisting
                ? `Created on ${initialPo?.orderDate}`
                : "Create a new purchase order for your vendor"}
            </p>
          </div>
          <div>{getStatusBadge(status)}</div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          {/* ─── Header Fields: PO No., Vendor Name, PO Date ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PO No. (Read-only) */}
            <div className="flex flex-col gap-2">
              <Label className="font-semibold text-foreground">PO No.</Label>
              <Input
                value={
                  isExisting
                    ? initialPo?.poNumber
                    : "Will be auto-generated (e.g. PO0001)"
                }
                disabled
                className="bg-muted/50 font-mono text-foreground font-medium"
              />
              <span className="text-[11px] text-muted-foreground">
                Sequential number computed automatically upon creation
              </span>
            </div>

            {/* Vendor Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="vendorId" className="font-semibold text-foreground">
                Vendor Name {!isReadOnly && <span className="text-destructive">*</span>}
              </Label>
              {isReadOnly ? (
                <Input
                  value={initialPo?.vendorName || initialPo?.vendor?.name || "—"}
                  disabled
                  className="bg-muted/50 font-medium"
                />
              ) : (
                <Controller
                  control={control}
                  name="vendorId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="vendorId" className="w-full">
                        <SelectValue
                          placeholder={
                            isLoadingContacts
                              ? "Loading vendors..."
                              : "Select a vendor"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No active vendors found
                          </div>
                        ) : (
                          vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.vendorId && (
                <p className="text-xs text-destructive font-medium">
                  {errors.vendorId.message}
                </p>
              )}
            </div>

            {/* PO Date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="orderDate" className="font-semibold text-foreground">
                PO Date {!isReadOnly && <span className="text-destructive">*</span>}
              </Label>
              {isReadOnly ? (
                <Input
                  value={initialPo?.orderDate || "—"}
                  disabled
                  className="bg-muted/50 font-medium"
                />
              ) : (
                <Input
                  id="orderDate"
                  type="date"
                  {...register("orderDate")}
                  className="w-full"
                />
              )}
              {errors.orderDate && (
                <p className="text-xs text-destructive font-medium">
                  {errors.orderDate.message}
                </p>
              )}
            </div>
          </div>

          {/* ─── Line Items Table ─── */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Order Line Items
              </h3>
              {!isReadOnly && canCreate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ productId: "", analyticAccountId: null, quantity: 1, unitPrice: 0 })
                  }
                  className="h-8 text-xs font-medium"
                >
                  <Plus className="mr-1 size-3.5" />
                  Add line
                </Button>
              )}
            </div>

            {errors.lines?.root && (
              <p className="text-xs text-destructive font-medium">
                {errors.lines.root.message}
              </p>
            )}

            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-16 text-center font-semibold">
                      Sr. No.
                    </TableHead>
                    <TableHead className="min-w-56 font-semibold">
                      Product {!isReadOnly && <span className="text-destructive">*</span>}
                    </TableHead>
                    <TableHead className="min-w-44 font-semibold">
                      Analytic Account
                    </TableHead>
                    <TableHead className="w-28 font-semibold">
                      Qty {!isReadOnly && <span className="text-destructive">*</span>}
                    </TableHead>
                    <TableHead className="w-40 font-semibold">
                      Unit Price (Rs.) {!isReadOnly && <span className="text-destructive">*</span>}
                    </TableHead>
                    <TableHead className="w-40 text-right font-semibold">
                      Total
                    </TableHead>
                    {!isReadOnly && <TableHead className="w-12 text-center" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((fieldItem, index) => {
                    const currentLine = watchedLines[index];
                    const qty = Number(currentLine?.quantity) || 0;
                    const price = Number(currentLine?.unitPrice) || 0;
                    const lineSubtotal = Math.round(qty * price * 100) / 100;
                    const lineProduct = productMap.get(currentLine?.productId);

                    return (
                      <TableRow key={fieldItem.id} className="hover:bg-muted/20">
                        {/* Sr. No. */}
                        <TableCell className="text-center font-mono font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {/* Product */}
                        <TableCell>
                          {isReadOnly ? (
                            <span className="font-medium text-foreground">
                              {lineProduct?.name ||
                                initialPo?.lines?.[index]?.productName ||
                                "—"}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Controller
                                control={control}
                                name={`lines.${index}.productId`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={(val) => {
                                      if (val) handleProductSelect(index, val);
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue
                                        placeholder={
                                          isLoadingProducts
                                            ? "Loading products..."
                                            : "Select product"
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {unarchivedProducts.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-muted-foreground">
                                          No active products found
                                        </div>
                                      ) : (
                                        unarchivedProducts.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}{" "}
                                            <span className="text-xs text-muted-foreground">
                                              ({formatCurrency(Number(p.costPrice || 0))})
                                            </span>
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {errors.lines?.[index]?.productId && (
                                <p className="text-xs text-destructive font-medium">
                                  {errors.lines[index]?.productId?.message}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Analytic Account */}
                        <TableCell>
                          {isReadOnly ? (
                            <span className="text-sm font-medium text-muted-foreground">
                              {initialPo?.lines?.[index]?.analyticAccountName || "—"}
                            </span>
                          ) : (
                            <Controller
                              control={control}
                              name={`lines.${index}.analyticAccountId`}
                              render={({ field }) => (
                                <Select
                                  value={field.value || "none"}
                                  onValueChange={(val) =>
                                    field.onChange(val === "none" ? null : val)
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {expenseAnalytics.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          )}
                        </TableCell>

                        {/* Qty */}
                        <TableCell>
                          {isReadOnly ? (
                            <span className="font-mono font-medium text-foreground">
                              {qty}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Controller
                                control={control}
                                name={`lines.${index}.quantity`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    placeholder="1"
                                    className="font-mono text-right"
                                    value={
                                      field.value === undefined || field.value === null
                                        ? ""
                                        : field.value
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val = raw === "" ? 0 : parseFloat(raw);
                                      field.onChange(Number.isNaN(val) ? 0 : val);
                                    }}
                                  />
                                )}
                              />
                              {errors.lines?.[index]?.quantity && (
                                <p className="text-xs text-destructive font-medium">
                                  {errors.lines[index]?.quantity?.message}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell>
                          {isReadOnly ? (
                            <span className="font-mono font-medium text-foreground">
                              {formatCurrency(price)}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Controller
                                control={control}
                                name={`lines.${index}.unitPrice`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="font-mono text-right"
                                    value={
                                      field.value === undefined || field.value === null
                                        ? ""
                                        : field.value
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val = raw === "" ? 0 : parseFloat(raw);
                                      field.onChange(Number.isNaN(val) ? 0 : val);
                                    }}
                                  />
                                )}
                              />
                              {errors.lines?.[index]?.unitPrice && (
                                <p className="text-xs text-destructive font-medium">
                                  {errors.lines[index]?.unitPrice?.message}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Computed Total */}
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatCurrency(lineSubtotal)}
                        </TableCell>

                        {/* Action (Delete) */}
                        {!isReadOnly && (
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={fields.length <= 1}
                              onClick={() => remove(index)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ─── Bottom Total Row (Per Mockup) ─── */}
            <div className="flex justify-end pt-3">
              <div className="flex items-center gap-6 rounded-lg border bg-muted/30 px-6 py-3">
                <span className="text-base font-bold text-foreground tracking-wide">
                  Total
                </span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Confirmation Alert Dialog (For Confirming PO) ─── */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Confirm Purchase Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm this purchase order? Once confirmed,
              order quantities and prices are locked to prevent accidental modifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Review Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirm}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSubmitting ? "Confirming..." : "Confirm PO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Cancel Alert Dialog (For Cancelling PO) ─── */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Cancel Purchase Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this purchase order? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeCancel}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
