import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import {
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  fetchSalesOrder,
  fetchSalesOrders,
  type CreateSalesOrderPayload,
  type UpdateSalesOrderPayload,
} from "./sales-orders-api";

export function useSalesOrders(params?: { search?: string; status?: string }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["sales-orders", organizationId, params],
    queryFn: () => fetchSalesOrders(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useSalesOrder(id: string) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["sales-orders", organizationId, id],
    queryFn: () => fetchSalesOrder(id),
    enabled: !isSessionPending && Boolean(organizationId) && Boolean(id),
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) =>
      createSalesOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

export function useUpdateSalesOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSalesOrderPayload) =>
      updateSalesOrder(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.setQueryData(
        ["sales-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}

export function useConfirmSalesOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => confirmSalesOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.setQueryData(
        ["sales-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}

export function useCancelSalesOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelSalesOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.setQueryData(
        ["sales-orders", updated.organizationId, id],
        updated,
      );
    },
  });
}
