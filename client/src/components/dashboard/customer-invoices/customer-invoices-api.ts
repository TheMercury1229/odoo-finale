import api from "@/lib/axios";

export type InvoiceStatus = "Paid" | "Partial" | "Not Paid";

export interface CustomerInvoiceLineItem {
  id?: string;
  productId: string;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface CustomerInvoicePayment {
  id: string;
  paymentNumber?: string;
  direction: "inbound" | "outbound";
  method: "cash" | "bank";
  amount: number;
  date: string;
  createdAt: string;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  soNumber?: string | null;
  soDate?: string | null;
  customerId: string;
  customerName?: string | null;
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPincode?: string | null;
  } | null;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  subtotal?: number;
  totalTax?: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  journalEntryId?: string | null;
  lines?: CustomerInvoiceLineItem[];
  payments?: CustomerInvoicePayment[];
  createdAt: string;
}

export interface CustomerInvoiceListResponse {
  customerInvoices: CustomerInvoice[];
}

export interface CreateCustomerInvoicePayload {
  salesOrderId: string;
  invoiceDate: string;
  dueDate?: string | null;
}

export async function fetchCustomerInvoices(params?: {
  search?: string;
  status?: string;
}) {
  const { data } = await api.get<CustomerInvoiceListResponse>(
    "/api/customer-invoices",
    {
      params: {
        search: params?.search || undefined,
        status:
          params?.status && params.status !== "all"
            ? params.status
            : undefined,
      },
    },
  );
  return data.customerInvoices;
}

export async function fetchCustomerInvoice(id: string) {
  const { data } = await api.get<CustomerInvoice>(
    `/api/customer-invoices/${id}`,
  );
  return data;
}

export async function createCustomerInvoice(
  payload: CreateCustomerInvoicePayload,
) {
  const { data } = await api.post<CustomerInvoice>(
    "/api/customer-invoices",
    payload,
  );
  return data;
}
