import api from "@/lib/axios";

export type SalesOrderStatus = "draft" | "confirmed" | "cancelled";

export interface SalesOrderLineItem {
  id?: string;
  salesOrderId?: string;
  productId: string;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  subtotal?: number;
  total?: number;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  organizationId: string;
  customerId: string;
  customerName?: string;
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPincode?: string | null;
    profileImageUrl?: string | null;
  } | null;
  status: SalesOrderStatus;
  orderDate: string; // YYYY-MM-DD
  subtotal?: number;
  totalTax?: number;
  total: number;
  hasInvoice: boolean;
  invoiceId: string | null;
  createdBy?: string;
  createdAt: string;
  lines: SalesOrderLineItem[];
}

export interface SalesOrderListResponse {
  salesOrders: SalesOrder[];
}

export interface CreateSalesOrderPayload {
  customerId: string;
  orderDate: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }>;
}

export interface UpdateSalesOrderPayload {
  customerId?: string;
  orderDate?: string;
  lines?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }>;
}

export async function fetchSalesOrders(params?: {
  search?: string;
  status?: string;
}) {
  const { data } = await api.get<SalesOrderListResponse>("/api/sales-orders", {
    params: {
      search: params?.search || undefined,
      status:
        params?.status && params.status !== "all" ? params.status : undefined,
    },
  });
  return data.salesOrders;
}

export async function fetchSalesOrder(id: string) {
  const { data } = await api.get<SalesOrder>(`/api/sales-orders/${id}`);
  return data;
}

export async function createSalesOrder(payload: CreateSalesOrderPayload) {
  const { data } = await api.post<SalesOrder>("/api/sales-orders", payload);
  return data;
}

export async function updateSalesOrder(
  id: string,
  payload: UpdateSalesOrderPayload,
) {
  const { data } = await api.patch<SalesOrder>(
    `/api/sales-orders/${id}`,
    payload,
  );
  return data;
}

export async function confirmSalesOrder(id: string) {
  const { data } = await api.patch<SalesOrder>(
    `/api/sales-orders/${id}/confirm`,
  );
  return data;
}

export async function cancelSalesOrder(id: string) {
  const { data } = await api.patch<SalesOrder>(
    `/api/sales-orders/${id}/cancel`,
  );
  return data;
}
