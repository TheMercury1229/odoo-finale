import api from "@/lib/axios";

export type PortalDocStatus = "Paid" | "Partial" | "Not Paid";

export interface PortalPayment {
  id: string;
  paymentNumber?: string;
  direction: "inbound" | "outbound";
  method: "cash" | "bank";
  amount: number;
  date: string;
  createdAt: string;
}

export interface PortalBillLineItem {
  id: string;
  productId: string;
  product?: string | null;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PortalBill {
  id: string;
  billNumber: string;
  vendorReference?: string | null;
  purchaseOrderId?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  vendorId?: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: PortalDocStatus;
  lines?: PortalBillLineItem[];
  payments?: PortalPayment[];
  createdAt?: string;
}

export interface PortalInvoiceLineItem {
  id: string;
  productId: string;
  product?: string | null;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  subtotal: number;
  total: number;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  salesOrderId?: string | null;
  soNumber?: string | null;
  soDate?: string | null;
  customerId?: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: PortalDocStatus;
  lines?: PortalInvoiceLineItem[];
  payments?: PortalPayment[];
  createdAt?: string;
}

export async function fetchPortalBills(params?: {
  search?: string;
  status?: string;
}): Promise<PortalBill[]> {
  const res = await api.get<PortalBill[]>("/api/portal/bills", { params });
  return res.data;
}

export async function fetchPortalBill(id: string): Promise<PortalBill> {
  const res = await api.get<PortalBill>(`/api/portal/bills/${id}`);
  return res.data;
}

export async function fetchPortalInvoices(params?: {
  search?: string;
  status?: string;
}): Promise<PortalInvoice[]> {
  const res = await api.get<PortalInvoice[]>("/api/portal/invoices", { params });
  return res.data;
}

export async function fetchPortalInvoice(id: string): Promise<PortalInvoice> {
  const res = await api.get<PortalInvoice>(`/api/portal/invoices/${id}`);
  return res.data;
}
