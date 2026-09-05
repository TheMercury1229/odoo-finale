"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchContact,
  fetchContacts,
} from "@/components/dashboard/contacts/contacts-api";
import { authClient } from "@/lib/auth";

export function useContacts(params: {
  search: string;
  includeArchived: boolean;
  view: "list" | "kanban";
}) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;

  return useQuery({
    queryKey: ["contacts", organizationId, params],
    queryFn: () => fetchContacts(params),
    enabled: !isSessionPending && Boolean(organizationId),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => fetchContact(id),
    enabled: Boolean(id),
  });
}
