import api from "@/lib/axios";

export type ProductType = "goods" | "service" | "combo";

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: string;
  costPrice: string;
  category?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductListResponse {
  view: "list";
  products: Product[];
}

interface ProductKanbanResponse {
  view: "kanban";
  groups: Array<{ type: ProductType; products: Product[] }>;
}

export type ProductListResult = ProductListResponse | ProductKanbanResponse;

export interface ProductPayload {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  category?: string;
}

export async function fetchProducts(params: {
  search?: string;
  includeArchived?: boolean;
  view?: "list" | "kanban";
}) {
  const { data } = await api.get<ProductListResult>("/api/products", {
    params: {
      search: params.search || undefined,
      includeArchived:
        typeof params.includeArchived === "boolean"
          ? String(params.includeArchived)
          : undefined,
      view: params.view || "list",
    },
  });

  return data;
}

export async function fetchProduct(id: string) {
  const { data } = await api.get<Product>(`/api/products/${id}`);
  return data;
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await api.post<Product>("/api/products", payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
) {
  const { data } = await api.patch<Product>(`/api/products/${id}`, payload);
  return data;
}

export async function setProductArchived(id: string, archived: boolean) {
  const { data } = await api.patch<Product>(
    `/api/products/${id}/${archived ? "archive" : "unarchive"}`,
    {},
  );
  return data;
}
