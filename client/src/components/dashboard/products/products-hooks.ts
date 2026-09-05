"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchProduct,
  fetchProducts,
} from "@/components/dashboard/products/products-api";
import { authClient } from "@/lib/auth";

export function useProducts(params: {
  search: string;
  includeArchived: boolean;
  view: "list" | "kanban";
}) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["products", organizationId, params],
    queryFn: () => fetchProducts(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
  });
}
