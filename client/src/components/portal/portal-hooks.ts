"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPortalBill,
  fetchPortalBills,
  fetchPortalInvoice,
  fetchPortalInvoices,
} from "./portal-api";

export function usePortalBills(params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ["portal-bills", params],
    queryFn: () => fetchPortalBills(params),
  });
}

export function usePortalBill(id: string) {
  return useQuery({
    queryKey: ["portal-bills", id],
    queryFn: () => fetchPortalBill(id),
    enabled: Boolean(id),
  });
}

export function usePortalInvoices(params?: {
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["portal-invoices", params],
    queryFn: () => fetchPortalInvoices(params),
  });
}

export function usePortalInvoice(id: string) {
  return useQuery({
    queryKey: ["portal-invoices", id],
    queryFn: () => fetchPortalInvoice(id),
    enabled: Boolean(id),
  });
}
