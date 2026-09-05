import api from "@/lib/axios";

export type AccountType =
  | "asset"
  | "liability"
  | "income"
  | "expense"
  | "capital";

export interface ChartAccount {
  id: string;
  organizationId: string;
  name: string;
  type: AccountType;
  isArchived: boolean;
  createdAt: string;
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
}

export interface AccountsResponse {
  accounts: ChartAccount[];
}

export const accountTypeDisplayLabels: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  income: "Income",
  expense: "Expense",
  capital: "Capital",
};

export interface DropdownOption {
  label: string;
  value: AccountType;
}

export interface DropdownGroup {
  group: string;
  options: DropdownOption[];
}

export const accountTypeDropdownGroups: DropdownGroup[] = [
  {
    group: "Balancesheet",
    options: [
      { label: "Asset", value: "asset" },
      { label: "Liability", value: "liability" },
      { label: "Bank", value: "asset" },
      { label: "Capital", value: "capital" },
      { label: "Cash", value: "asset" },
    ],
  },
  {
    group: "Profit and Loss",
    options: [
      { label: "Income", value: "income" },
      { label: "Expenses", value: "expense" },
      { label: "Other Expenses", value: "expense" },
    ],
  },
];

export async function fetchAccounts(params?: {
  includeArchived?: boolean;
  search?: string;
}) {
  const { data } = await api.get<AccountsResponse>("/api/chart-of-accounts", {
    params: {
      includeArchived: params?.includeArchived || undefined,
      search: params?.search || undefined,
    },
  });
  return data.accounts;
}

export async function createAccount(payload: CreateAccountPayload) {
  const { data } = await api.post<ChartAccount>(
    "/api/chart-of-accounts",
    payload,
  );
  return data;
}

export async function setAccountArchived(id: string, archived: boolean) {
  const { data } = await api.patch<ChartAccount>(
    `/api/chart-of-accounts/${id}/${archived ? "archive" : "unarchive"}`,
    {},
  );
  return data;
}
