import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import {
  createCustomerInvoice,
  fetchCustomerInvoice,
  fetchCustomerInvoices,
  type CreateCustomerInvoicePayload,
} from "./customer-invoices-api";

export function useCustomerInvoices(params?: {
  search?: string;
  status?: string;
}) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["customer-invoices", organizationId, params],
    queryFn: () => fetchCustomerInvoices(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useCustomerInvoice(id: string) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["customer-invoices", organizationId, id],
    queryFn: () => fetchCustomerInvoice(id),
    enabled: !isSessionPending && Boolean(organizationId) && Boolean(id),
  });
}

export function useCreateCustomerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerInvoicePayload) =>
      createCustomerInvoice(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}
