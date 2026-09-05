import api from "@/lib/axios";

export interface JournalEntryLine {
  id?: string;
  journalEntryId?: string;
  accountId: string;
  accountName?: string;
  contactId?: string | null;
  contactName?: string | null;
  debit: number | string;
  credit: number | string;
}

export interface JournalEntry {
  id: string;
  date: string;
  number: string;
  reference: string | null;
  partner: string;
  journalId: string;
  journalName: string;
  sourceType: "vendor_bill" | "customer_invoice" | "payment" | "manual";
  totalAmount: number;
  status: "Posted" | "Draft";
  createdAt: string;
  lines?: JournalEntryLine[];
}

export interface CreateJournalEntryPayload {
  date: string; // YYYY-MM-DD
  journalId: string;
  lines: Array<{
    accountId: string;
    contactId?: string | null;
    debit: number;
    credit: number;
  }>;
}

export interface JournalEntriesResponse {
  journalEntries: JournalEntry[];
}

export async function fetchJournalEntries(params?: { journalId?: string }) {
  const { data } = await api.get<JournalEntriesResponse>(
    "/api/journal-entries",
    {
      params: {
        journalId: params?.journalId || undefined,
      },
    },
  );
  return data.journalEntries;
}

export async function createJournalEntry(payload: CreateJournalEntryPayload) {
  const { data } = await api.post<JournalEntry>(
    "/api/journal-entries",
    payload,
  );
  return data;
}
