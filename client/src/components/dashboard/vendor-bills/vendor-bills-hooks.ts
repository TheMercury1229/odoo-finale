import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import {
  createVendorBill,
  fetchVendorBill,
  fetchVendorBills,
  type CreateVendorBillPayload,
} from "./vendor-bills-api";

export function useVendorBills(params?: { search?: string; status?: string }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["vendor-bills", organizationId, params],
    queryFn: () => fetchVendorBills(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useVendorBill(id: string) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["vendor-bills", organizationId, id],
    queryFn: () => fetchVendorBill(id),
    enabled: !isSessionPending && Boolean(organizationId) && Boolean(id),
  });
}

export function useCreateVendorBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVendorBillPayload) => createVendorBill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}
