import api from "@/lib/axios";

export type JournalType = "sales" | "purchase" | "bank" | "cash";

export interface DefaultAccount {
  accountId: string;
  accountName: string;
  accountType: string;
}

export interface Journal {
  id: string;
  organizationId: string;
  name: string;
  type: JournalType;
  defaultAccountId: string | null;
  createdAt: string;
  defaultAccount: DefaultAccount | null;
}

export interface CreateJournalPayload {
  name: string;
  type: JournalType;
  defaultAccountId?: string | null;
}

export interface JournalsResponse {
  journals: Journal[];
}

export const journalTypeLabels: Record<JournalType, string> = {
  sales: "Sales",
  purchase: "Purchase",
  bank: "Bank",
  cash: "Cash",
};

export async function fetchJournals() {
  const { data } = await api.get<JournalsResponse>("/api/journals");
  return data.journals;
}

export async function createJournal(payload: CreateJournalPayload) {
  const { data } = await api.post<Journal>("/api/journals", payload);
  return data;
}
