import api from "@/lib/axios";

export interface RecordPaymentPayload {
  targetType: "vendor_bill" | "customer_invoice";
  targetId: string;
  method: "cash" | "bank";
  amount: number;
  date: string;
  note?: string | null;
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  method: "cash" | "bank";
  direction: "inbound" | "outbound";
  amount: number;
  date: string;
  note?: string | null;
  recordedByName?: string | null;
  createdAt: string;
}

export interface RecordPaymentResponse {
  id: string;
  paymentNumber: string;
  direction: "inbound" | "outbound";
  method: "cash" | "bank";
  amount: number;
  date: string;
  note?: string | null;
  vendorBillId?: string | null;
  customerInvoiceId?: string | null;
  journalEntryId: string;
  recordedBy: string;
  createdAt: string;
  target: {
    targetType: "vendor_bill" | "customer_invoice";
    targetId: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    status: "Paid" | "Partial" | "Not Paid";
  };
}

export async function recordPayment(payload: RecordPaymentPayload) {
  const { data } = await api.post<RecordPaymentResponse>(
    "/api/payments",
    payload,
  );
  return data;
}

export async function fetchPayments(params: {
  targetType: "vendor_bill" | "customer_invoice";
  targetId: string;
}) {
  const { data } = await api.get<{ payments: PaymentRecord[] }>(
    "/api/payments",
    {
      params,
    },
  );
  return data.payments;
}
