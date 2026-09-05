import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import {
  fetchPayments,
  recordPayment,
  type RecordPaymentPayload,
} from "./payments-api";

export function usePayments(params: {
  targetType: "vendor_bill" | "customer_invoice";
  targetId: string;
}) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["payments", organizationId, params],
    queryFn: () => fetchPayments(params),
    enabled:
      !isSessionPending &&
      Boolean(organizationId) &&
      Boolean(params.targetId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => recordPayment(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
    },
  });
}
