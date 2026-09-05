import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { fetchBalanceSheet, fetchProfitLoss } from "./reports-api";

export function useBalanceSheet(params?: { asOf?: string }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["reports", "balance-sheet", organizationId, params?.asOf],
    queryFn: () => fetchBalanceSheet(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useProfitLoss(params?: { from?: string; to?: string }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: [
      "reports",
      "profit-loss",
      organizationId,
      params?.from,
      params?.to,
    ],
    queryFn: () => fetchProfitLoss(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}
