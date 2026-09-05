import api from "@/lib/axios";

export type AnalyticAccountType = "income" | "expense";

export interface AnalyticAccount {
  id: string;
  organizationId: string;
  name: string;
  type: AnalyticAccountType;
  isArchived: boolean;
  createdAt: string;
}

export interface CreateAnalyticAccountPayload {
  name: string;
  type: AnalyticAccountType;
}

export interface UpdateAnalyticAccountPayload {
  name?: string;
  type?: AnalyticAccountType;
}

export interface AnalyticAccountsResponse {
  analyticAccounts: AnalyticAccount[];
}

export const analyticTypeDisplayLabels: Record<AnalyticAccountType, string> = {
  income: "Income",
  expense: "Expense",
};

export async function fetchAnalyticAccounts(params?: {
  includeArchived?: boolean;
  search?: string;
  type?: string;
}): Promise<AnalyticAccount[]> {
  const { data } = await api.get<AnalyticAccountsResponse>(
    "/api/analytic-accounts",
    {
      params: {
        includeArchived: params?.includeArchived ? "true" : undefined,
        search: params?.search || undefined,
        type: params?.type || undefined,
      },
    },
  );
  return data.analyticAccounts || [];
}

export async function fetchAnalyticAccount(
  id: string,
): Promise<AnalyticAccount> {
  const { data } = await api.get<AnalyticAccount>(
    `/api/analytic-accounts/${id}`,
  );
  return data;
}

export async function createAnalyticAccount(
  payload: CreateAnalyticAccountPayload,
): Promise<AnalyticAccount> {
  const { data } = await api.post<AnalyticAccount>(
    "/api/analytic-accounts",
    payload,
  );
  return data;
}

export async function updateAnalyticAccount(
  id: string,
  payload: UpdateAnalyticAccountPayload,
): Promise<AnalyticAccount> {
  const { data } = await api.patch<AnalyticAccount>(
    `/api/analytic-accounts/${id}`,
    payload,
  );
  return data;
}

export async function setAnalyticAccountArchived(
  id: string,
  archived: boolean,
): Promise<AnalyticAccount> {
  const endpoint = `/api/analytic-accounts/${id}/${archived ? "archive" : "unarchive"}`;
  const { data } = await api.patch<AnalyticAccount>(endpoint);
  return data;
}
