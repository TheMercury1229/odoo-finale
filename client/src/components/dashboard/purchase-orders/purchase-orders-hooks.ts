import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  type CreatePurchaseOrderPayload,
  type UpdatePurchaseOrderPayload,
  type PurchaseOrder,
} from "./purchase-orders-api";

export function usePurchaseOrders(params?: { search?: string; status?: string }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["purchase-orders", organizationId, params],
    queryFn: () => fetchPurchaseOrders(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function usePurchaseOrder(id: string) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["purchase-orders", organizationId, id],
    queryFn: () => fetchPurchaseOrder(id),
    enabled: !isSessionPending && Boolean(organizationId) && Boolean(id),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) =>
      createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useUpdatePurchaseOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePurchaseOrderPayload) =>
      updatePurchaseOrder(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.setQueryData(
        ["purchase-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}

export function useConfirmPurchaseOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => confirmPurchaseOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.setQueryData(
        ["purchase-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}

export function useCancelPurchaseOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelPurchaseOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.setQueryData(
        ["purchase-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}
