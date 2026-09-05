import api from "@/lib/axios";

export type PurchaseOrderStatus = "draft" | "confirmed" | "cancelled";

export interface PurchaseOrderLineItem {
  id?: string;
  purchaseOrderId?: string;
  productId: string;
  productName?: string | null;
  productType?: string | null;
  productCategory?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  organizationId: string;
  vendorId: string;
  vendorName?: string;
  vendor?: {
    id: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
  } | null;
  status: PurchaseOrderStatus;
  orderDate: string; // YYYY-MM-DD
  total: number;
  hasBill: boolean;
  billId: string | null;
  createdBy?: string;
  createdAt: string;
  lines: PurchaseOrderLineItem[];
}

export interface PurchaseOrderListResponse {
  purchaseOrders: PurchaseOrder[];
}

export interface CreatePurchaseOrderPayload {
  vendorId: string;
  orderDate: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdatePurchaseOrderPayload {
  vendorId?: string;
  orderDate?: string;
  lines?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function fetchPurchaseOrders(params?: {
  search?: string;
  status?: string;
}) {
  const { data } = await api.get<PurchaseOrderListResponse>(
    "/api/purchase-orders",
    {
      params: {
        search: params?.search || undefined,
        status: params?.status && params.status !== "all" ? params.status : undefined,
      },
    },
  );
  return data.purchaseOrders;
}

export async function fetchPurchaseOrder(id: string) {
  const { data } = await api.get<PurchaseOrder>(`/api/purchase-orders/${id}`);
  return data;
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
  const { data } = await api.post<PurchaseOrder>(
    "/api/purchase-orders",
    payload,
  );
  return data;
}

export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePurchaseOrderPayload,
) {
  const { data } = await api.patch<PurchaseOrder>(
    `/api/purchase-orders/${id}`,
    payload,
  );
  return data;
}

export async function confirmPurchaseOrder(id: string) {
  const { data } = await api.patch<PurchaseOrder>(
    `/api/purchase-orders/${id}/confirm`,
  );
  return data;
}

export async function cancelPurchaseOrder(id: string) {
  const { data } = await api.patch<PurchaseOrder>(
    `/api/purchase-orders/${id}/cancel`,
  );
  return data;
}
