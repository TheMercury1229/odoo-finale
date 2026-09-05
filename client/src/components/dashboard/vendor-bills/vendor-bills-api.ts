import api from "@/lib/axios";

export type BillStatus = "Paid" | "Partial" | "Not Paid";

export interface VendorBillLineItem {
  id?: string;
  productId: string;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface VendorBillPayment {
  id: string;
  paymentNumber?: string;
  direction: "inbound" | "outbound";
  method: "cash" | "bank";
  amount: number;
  date: string;
  createdAt: string;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorReference?: string | null;
  purchaseOrderId: string;
  poNumber?: string | null;
  poDate?: string | null;
  vendorId: string;
  vendorName?: string | null;
  vendor?: {
    id: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
  } | null;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: BillStatus;
  journalEntryId?: string | null;
  lines?: VendorBillLineItem[];
  payments?: VendorBillPayment[];
  createdAt: string;
}

export interface VendorBillListResponse {
  vendorBills: VendorBill[];
}

export interface CreateVendorBillPayload {
  purchaseOrderId: string;
  vendorReference?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
}

export async function fetchVendorBills(params?: {
  search?: string;
  status?: string;
}) {
  const { data } = await api.get<VendorBillListResponse>("/api/vendor-bills", {
    params: {
      search: params?.search || undefined,
      status:
        params?.status && params.status !== "all" ? params.status : undefined,
    },
  });
  return data.vendorBills;
}

export async function fetchVendorBill(id: string) {
  const { data } = await api.get<VendorBill>(`/api/vendor-bills/${id}`);
  return data;
}

export async function createVendorBill(payload: CreateVendorBillPayload) {
  const { data } = await api.post<VendorBill>("/api/vendor-bills", payload);
  return data;
}
