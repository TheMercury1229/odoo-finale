"use client";

import { authClient } from "@/lib/auth";

export function useUserPermissions() {
  const { data: session, isPending } = authClient.useSession();
  const role = session?.user?.role;

  const isAdmin = role === "admin";
  const isAccountant = role === "accountant";
  const isContact = role === "contact";

  // Master Data (Contacts, Products, Chart of Accounts, Journals)
  const canCreateMasterData = isAdmin || isAccountant;
  const canEditMasterData = isAdmin || isAccountant;
  const canArchiveMasterData = isAdmin; // Admin ONLY

  // Transactions (Purchase Orders, Vendor Bills, Sales Orders, Customer Invoices, Journal Entries)
  const canCreateTransaction = isAdmin || isAccountant;
  const canUpdateTransaction = isAdmin || isAccountant;
  const canConfirmTransaction = isAdmin || isAccountant;
  const canCancelTransaction = isAdmin || isAccountant;
  const canRecordPayment = isAdmin || isAccountant || isContact;

  // Settings & User Management
  const canManageUsers = isAdmin;

  // Reports
  const canViewReports = isAdmin || isAccountant;

  return {
    session,
    isPending,
    role,
    isAdmin,
    isAccountant,
    isContact,
    // Master data
    canCreateMasterData,
    canEditMasterData,
    canArchiveMasterData,
    // Transactions
    canCreateTransaction,
    canUpdateTransaction,
    canConfirmTransaction,
    canCancelTransaction,
    canRecordPayment,
    // Management & Reports
    canManageUsers,
    canViewReports,
  };
}
