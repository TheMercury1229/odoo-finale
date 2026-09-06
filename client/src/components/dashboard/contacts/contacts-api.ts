import api from "@/lib/axios";

export type ContactType = "customer" | "vendor" | "both";

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  type: ContactType;
  addressCity?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
  profileImageUrl?: string | null;
  userId?: string | null;
  isArchived: boolean;
}

interface ContactListResponse {
  view: "list";
  contacts: Contact[];
}

interface ContactKanbanResponse {
  view: "kanban";
  groups: Array<{ type: ContactType; contacts: Contact[] }>;
}

export type ContactListResult = ContactListResponse | ContactKanbanResponse;

export interface ContactPayload {
  name: string;
  email: string;
  mobile?: string;
  type: ContactType;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
  profileImageUrl?: string;
  // Optional password for the portal user account (auto-generated server-side if omitted)
  password?: string;
}

export async function fetchContacts(params: {
  search?: string;
  includeArchived?: boolean;
  view?: "list" | "kanban";
}) {
  const { data } = await api.get<ContactListResult>("/api/contacts", {
    params: {
      search: params.search || undefined,
      includeArchived:
        typeof params.includeArchived === "boolean"
          ? String(params.includeArchived)
          : undefined,
      view: params.view || "list",
    },
  });

  return data;
}

export async function fetchContact(id: string) {
  const { data } = await api.get<Contact>(`/api/contacts/${id}`);
  return data;
}

export async function createContact(payload: ContactPayload) {
  const { data } = await api.post<Contact>("/api/contacts", payload);
  return data;
}

export async function updateContact(
  id: string,
  payload: Partial<ContactPayload>,
) {
  const { data } = await api.patch<Contact>(`/api/contacts/${id}`, payload);
  return data;
}

export async function setContactArchived(id: string, archived: boolean) {
  const { data } = await api.patch<Contact>(
    `/api/contacts/${id}/${archived ? "archive" : "unarchive"}`,
    {},
  );
  return data;
}
