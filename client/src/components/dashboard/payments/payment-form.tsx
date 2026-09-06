"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  X,
} from "lucide-react";

import { useRecordPayment } from "./payments-hooks";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface TargetData {
  number?: string;
  partnerName?: string;
  totalAmount?: number;
  amountDue?: number;
  backUrl?: string;
}

export interface PaymentFormProps {
  targetType: "vendor_bill" | "customer_invoice";
  targetId: string;
  targetData?: TargetData;
  targetNumber?: string;
  partnerName?: string;
  totalAmount?: number;
  amountDue?: number;
  backUrl?: string;
  variant?: "admin" | "portal";
}

export function PaymentForm({
  targetType,
  targetId,
  targetData,
  targetNumber,
  partnerName,
  totalAmount,
  amountDue,
  backUrl,
  variant = "admin",
}: PaymentFormProps) {
  const router = useRouter();
  const { canRecordPayment } = useUserPermissions();
  const [apiError, setApiError] = useState<string | null>(null);

  const isPortal = variant === "portal";

  // Derive final values from targetData or flat props
  const finalNumber = targetNumber ?? targetData?.number ?? "";
  const finalPartnerName = partnerName ?? targetData?.partnerName ?? "—";
  const finalTotalAmount = totalAmount ?? targetData?.totalAmount ?? 0;
  const finalAmountDue = amountDue ?? targetData?.amountDue ?? 0;
  const defaultBackUrl = isPortal
    ? targetType === "vendor_bill"
      ? `/portal/bills/${targetId}`
      : `/portal/invoices/${targetId}`
    : targetType === "vendor_bill"
      ? `/vendor-bills/${targetId}`
      : `/customer-invoices/${targetId}`;
  const finalBackUrl = backUrl ?? targetData?.backUrl ?? defaultBackUrl;

  const isVendorBill = targetType === "vendor_bill";
  const defaultPaymentType = isVendorBill ? "Send" : "Receive";

  // Today's date YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const paymentSchema = useMemo(() => {
    return z.object({
      method: z.enum(["bank", "cash"], {
        message: "Payment method is required",
      }),
      amount: z.preprocess(
        (val) => (val === "" || val === undefined ? undefined : Number(val)),
        z
          .number({
            message: "Amount must be a valid number",
          })
          .positive("Amount must be greater than zero")
          .max(
            finalAmountDue,
            `Amount cannot exceed remaining due of ${formatCurrency(finalAmountDue)}`,
          ),
      ),
      date: z
        .string()
        .min(1, "Payment date is required")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      note: z.string().optional(),
    });
  }, [finalAmountDue]);

  type FormValues = z.infer<typeof paymentSchema>;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      method: "bank",
      amount: finalAmountDue,
      date: today,
      note: "",
    },
    mode: "onChange",
  });

  const recordPaymentMutation = useRecordPayment();

  const onSubmit = async (values: FormValues) => {
    if (recordPaymentMutation.isPending) return;
    try {
      setApiError(null);

      await recordPaymentMutation.mutateAsync({
        targetType,
        targetId,
        method: values.method,
        amount: Number(values.amount),
        date: values.date,
        note: values.note ? values.note.trim() : null,
      });

      router.push(finalBackUrl);
      router.refresh();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to record payment";
      setApiError(msg);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-6 pb-16">
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

      {/* ─── Main Payment Form Card ─── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                {isVendorBill ? "Bill Payment" : "Invoice Payment"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Recording payment against{" "}
                {isVendorBill ? "Vendor Bill" : "Customer Invoice"}{" "}
                {finalNumber ? (
                  <Link
                    href={finalBackUrl}
                    className="font-semibold text-primary underline"
                  >
                    {finalNumber}
                  </Link>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Target Balance summary */}
              <div className="text-right bg-muted/40 rounded-lg px-4 py-2 border">
                <div className="text-xs text-muted-foreground">Amount Due</div>
                <div className="text-base font-mono font-bold text-primary">
                  {formatCurrency(finalAmountDue)}
                </div>
              </div>

              {/* Actions */}
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(finalBackUrl)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>

              {(isPortal || canRecordPayment) && (
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onClick={handleSubmit(onSubmit)}
                  disabled={recordPaymentMutation.isPending}
                >
                  <Check className="mr-1.5 size-4" />
                  {recordPaymentMutation.isPending ? "Confirming..." : "Confirm"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {/* Left Column: Payment Type, Partner, Amount */}
              <div className="flex flex-col gap-6">
                {/* Payment Type (Radio: Send vs Receive/Receiving, disabled per mockup) */}
                <div className="flex flex-col gap-2.5">
                  <Label className="font-semibold text-foreground">
                    Payment Type
                  </Label>
                  <RadioGroup
                    value={defaultPaymentType}
                    disabled
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Send" id="type-send" />
                      <Label
                        htmlFor="type-send"
                        className={
                          defaultPaymentType === "Send"
                            ? "font-semibold text-foreground cursor-default"
                            : "text-muted-foreground cursor-default"
                        }
                      >
                        Send
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Receive" id="type-receive" />
                      <Label
                        htmlFor="type-receive"
                        className={
                          defaultPaymentType === "Receive"
                            ? "font-semibold text-foreground cursor-default"
                            : "text-muted-foreground cursor-default"
                        }
                      >
                        Receiving
                      </Label>
                    </div>
                  </RadioGroup>
                  <span className="text-[11px] text-muted-foreground">
                    Direction is automatically determined by{" "}
                    {isVendorBill ? "Vendor Bill (Send)" : "Customer Invoice (Receive)"}
                  </span>
                </div>

                {/* Partner (Vendor / Customer) */}
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold text-foreground">Partner</Label>
                  <Input
                    value={finalPartnerName || "—"}
                    disabled
                    className="bg-muted/50 font-semibold text-foreground cursor-not-allowed"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Default fetch from {isVendorBill ? "Vendor / Bill" : "Customer / Invoice"}
                  </span>
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="amount" className="font-semibold text-foreground">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      Max: {formatCurrency(finalAmountDue)}
                    </span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={finalAmountDue}
                    {...register("amount")}
                    className="font-mono text-base font-semibold"
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.amount.message}
                    </p>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Default fetch from bill amount due, editable for partial payments
                  </span>
                </div>
              </div>

              {/* Right Column: Date, Payment Via */}
              <div className="flex flex-col gap-6">
                {/* Date */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date" className="font-semibold text-foreground">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input id="date" type="date" {...register("date")} />
                  {errors.date && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.date.message}
                    </p>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Default: today&apos;s date
                  </span>
                </div>

                {/* Payment Via (Select: Bank or Cash) */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="method" className="font-semibold text-foreground">
                    Payment Via <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="method"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="method" className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.method && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.method.message}
                    </p>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Journal and account balance will update automatically
                  </span>
                </div>
              </div>
            </div>

            {/* Full-width Note row below columns (Per Mockup) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
              <Label htmlFor="note" className="font-semibold text-foreground">
                Note
              </Label>
              <Textarea
                id="note"
                rows={3}
                placeholder="Alpha numeric (Text) — e.g. Check / NEFT reference number, remarks..."
                {...register("note")}
              />
              <span className="text-[11px] text-muted-foreground">
                Optional note recorded as reference on the double-entry journal entry
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
