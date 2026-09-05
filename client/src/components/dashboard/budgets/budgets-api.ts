import api from "@/lib/axios";

export type BudgetStatus = "draft" | "confirmed" | "revised" | "cancelled";

export interface Budget {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  committedAmount: string | number;
  status: BudgetStatus;
  responsibleContactId: string;
  responsibleContactName: string;
  analyticAccountId: string;
  analyticAccountName: string;
  analyticAccountType: "income" | "expense" | null;
  revisionOfId?: string | null;
  revisionOf?: { id: string; name: string; status?: string } | null;
  revisions?: Array<{
    id: string;
    name: string;
    status: BudgetStatus;
    committedAmount?: string | number;
  }>;
  achievedAmount?: number | null;
  achievedPercent?: number | null;
  amountToAchieve?: number | null;
  createdBy?: string;
  createdAt: string;
}

export interface CreateBudgetPayload {
  name: string;
  periodStart: string;
  periodEnd: string;
  responsibleContactId: string;
  analyticAccountId: string;
  committedAmount: number;
}

export interface UpdateBudgetPayload {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  responsibleContactId?: string;
  analyticAccountId?: string;
  committedAmount?: number;
}

export interface ReviseBudgetPayload {
  committedAmount: number;
}

export interface BudgetsResponse {
  budgets: Budget[];
}

export interface AchievedDetailItem {
  id: string;
  number: string;
  date: string;
  amount: number;
}

export interface AchievedDetailResponse {
  budgetId: string;
  budgetName: string;
  status: BudgetStatus;
  analyticAccountId: string;
  analyticAccountName: string;
  analyticAccountType: "income" | "expense";
  documentType: "vendor_bill" | "customer_invoice" | null;
  totalAchievedAmount: number;
  items: AchievedDetailItem[];
}

export interface AnalyticAccountBudget {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  committedAmount: string | number;
  status: BudgetStatus;
  achievedAmount?: number | null;
  createdAt: string;
}

export interface AnalyticAccountBudgetsResponse {
  budgets: AnalyticAccountBudget[];
}

export async function fetchBudgets(): Promise<Budget[]> {
  const { data } = await api.get<BudgetsResponse>("/api/budgets");
  return data.budgets || [];
}

export async function fetchBudget(id: string): Promise<Budget> {
  const { data } = await api.get<Budget>(`/api/budgets/${id}`);
  return data;
}

export async function createBudget(payload: CreateBudgetPayload): Promise<Budget> {
  const { data } = await api.post<Budget>("/api/budgets", payload);
  return data;
}

export async function updateBudget(
  id: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  const { data } = await api.patch<Budget>(`/api/budgets/${id}`, payload);
  return data;
}

export async function confirmBudget(id: string): Promise<Budget> {
  const { data } = await api.patch<Budget>(`/api/budgets/${id}/confirm`);
  return data;
}

export async function cancelBudget(id: string): Promise<Budget> {
  const { data } = await api.patch<Budget>(`/api/budgets/${id}/cancel`);
  return data;
}

export async function reviseBudget(
  id: string,
  payload: ReviseBudgetPayload,
): Promise<Budget> {
  const { data } = await api.post<Budget>(`/api/budgets/${id}/revise`, payload);
  return data;
}

export async function fetchBudgetAchievedDetail(
  id: string,
): Promise<AchievedDetailResponse> {
  const { data } = await api.get<AchievedDetailResponse>(
    `/api/budgets/${id}/achieved-detail`,
  );
  return data;
}

export async function fetchBudgetsForAnalyticAccount(
  analyticAccountId: string,
): Promise<AnalyticAccountBudget[]> {
  const { data } = await api.get<AnalyticAccountBudgetsResponse>(
    `/api/analytic-accounts/${analyticAccountId}/budgets`,
  );
  return data.budgets || [];
}

export interface ContactOption {
  id: string;
  name: string;
  email?: string | null;
  type: string;
}

export async function fetchContactsList(): Promise<ContactOption[]> {
  try {
    const { data } = await api.get<{ contacts?: ContactOption[] } | ContactOption[]>(
      "/api/contacts",
      {
        params: { view: "list" },
      },
    );
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.contacts)) return data.contacts;
    return [];
  } catch (err) {
    console.warn("Failed to fetch contacts list", err);
    return [];
  }
}
