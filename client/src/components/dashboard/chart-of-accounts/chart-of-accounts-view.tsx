"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Home,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  type AccountType,
  type ChartAccount,
  accountTypeDisplayLabels,
  createAccount,
  fetchAccounts,
  setAccountArchived,
} from "@/components/dashboard/chart-of-accounts/chart-of-accounts-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth";
import { useUserPermissions } from "@/lib/use-user-permissions";

type SelectionKey =
  | "asset"
  | "liability"
  | "bank"
  | "capital"
  | "cash"
  | "income"
  | "expenses"
  | "other_expenses";

const selectionToAccountType: Record<SelectionKey, AccountType> = {
  asset: "asset",
  liability: "liability",
  bank: "asset",
  capital: "capital",
  cash: "asset",
  income: "income",
  expenses: "expense",
  other_expenses: "expense",
};

export function ChartOfAccountsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, canCreateMasterData } = useUserPermissions();

  const [isCreating, setIsCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [accountName, setAccountName] = useState("");
  const [selectedTypeKey, setSelectedTypeKey] = useState<SelectionKey | "">("");
  const [formError, setFormError] = useState<{
    name?: string;
    type?: string;
  }>({});

  // Archive dialog state
  const [targetAccount, setTargetAccount] = useState<ChartAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart-of-accounts", showArchived, searchQuery],
    queryFn: () =>
      fetchAccounts({
        includeArchived: showArchived,
        search: searchQuery || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: AccountType }) =>
      createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.add({
        type: "success",
        title: "Account created",
        description: `Account "${accountName.trim()}" was created successfully.`,
      });
      setAccountName("");
      setSelectedTypeKey("");
      setFormError({});
      setIsCreating(false);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setFormError({ name: error.response.data.error });
        toast.add({
          type: "error",
          title: "Cannot create account",
          description: error.response.data.error,
        });
        return;
      }
      toast.add({
        type: "error",
        title: "Failed to create account",
        description: "Please check your network and try again.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (account: ChartAccount) =>
      setAccountArchived(account.id, !account.isArchived),
    onSuccess: (_, account) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.add({
        type: "success",
        title: account.isArchived ? "Account restored" : "Account archived",
        description: account.isArchived
          ? `Account "${account.name}" has been restored.`
          : `Account "${account.name}" has been archived.`,
      });
      setTargetAccount(null);
    },
    onError: () => {
      toast.add({
        type: "error",
        title: "Action failed",
        description: "Unable to update account status. Please try again.",
      });
    },
  });

  function handleConfirm() {
    const trimmed = accountName.trim();
    const errors: { name?: string; type?: string } = {};

    if (!trimmed) {
      errors.name = "Account Name is required.";
    }
    if (!selectedTypeKey) {
      errors.type = "Please select an Account Type.";
    }

    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }

    setFormError({});
    const mappedType = selectionToAccountType[selectedTypeKey as SelectionKey];
    createMutation.mutate({ name: trimmed, type: mappedType });
  }

  function handleBack() {
    if (isCreating) {
      setIsCreating(false);
      setAccountName("");
      setSelectedTypeKey("");
      setFormError({});
    } else {
      router.back();
    }
  }

  // Type badge color resolver
  function getTypeBadge(type: AccountType) {
    switch (type) {
      case "asset":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium"
          >
            {accountTypeDisplayLabels.asset}
          </Badge>
        );
      case "liability":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
          >
            {accountTypeDisplayLabels.liability}
          </Badge>
        );
      case "income":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
          >
            {accountTypeDisplayLabels.income}
          </Badge>
        );
      case "expense":
        return (
          <Badge
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium"
          >
            {accountTypeDisplayLabels.expense}
          </Badge>
        );
      case "capital":
        return (
          <Badge
            variant="outline"
            className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium"
          >
            {accountTypeDisplayLabels.capital}
          </Badge>
        );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* ─── Top Action Bar matching wireframe ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        {/* Left Action Buttons: New, Confirm, Archived */}
        <div className="flex flex-wrap items-center gap-2">
          {canCreateMasterData && (
            <>
              <Button
                type="button"
                variant={isCreating ? "secondary" : "default"}
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setIsCreating((prev) => !prev);
                  setFormError({});
                }}
              >
                <Plus className="size-4" />
                New
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5"
                disabled={!isCreating || createMutation.isPending}
                onClick={handleConfirm}
              >
                <Check className="size-4" />
                {createMutation.isPending ? "Confirming..." : "Confirm"}
              </Button>
            </>
          )}

          <Button
            type="button"
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            <Archive className="size-4" />
            {showArchived ? "Archived (Active)" : "Archived"}
          </Button>
        </div>

        {/* Right Action Buttons: Home, Back */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/")}
          >
            <Home className="size-4" />
            Home
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      </div>

      {/* ─── Header title & note from wireframe ─── */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Chart of Accounts (List View)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            All these accounts are to be pre-configured. Each account is assigned an
            Account Type for treatment and financial reporting.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search accounts..."
            className="h-8 pl-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── "When clicking on new" Form Card ─── */}
      {isCreating && (
        <Card className="border-primary/40 bg-card shadow-sm animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  New Account
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide account details and assign an Account Type
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Account Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="account-name"
                  className="text-xs font-semibold tracking-wide text-foreground"
                >
                  Account Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="account-name"
                  placeholder="e.g. Petty Cash, Office Supplies A/c"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    if (formError.name) {
                      setFormError((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={formError.name ? "border-destructive" : ""}
                  autoFocus
                />
                {formError.name ? (
                  <p className="text-xs text-destructive">{formError.name}</p>
                ) : null}
              </div>

              {/* Type Dropdown with Balancesheet & Profit and Loss Groups */}
              <div className="space-y-1.5">
                <label
                  htmlFor="account-type"
                  className="text-xs font-semibold tracking-wide text-foreground"
                >
                  Type <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedTypeKey}
                  onValueChange={(value) => {
                    setSelectedTypeKey(value as SelectionKey);
                    if (formError.type) {
                      setFormError((prev) => ({ ...prev, type: undefined }));
                    }
                  }}
                >
                  <SelectTrigger
                    id="account-type"
                    className={`w-full ${formError.type ? "border-destructive" : ""}`}
                  >
                    <SelectValue placeholder="Select an Account Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {/* Balancesheet Group */}
                    <SelectGroup>
                      <SelectLabel className="font-bold text-amber-700 dark:text-amber-400">
                        Balancesheet
                      </SelectLabel>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="capital">Capital</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectGroup>

                    <SelectSeparator />

                    {/* Profit and Loss Group */}
                    <SelectGroup>
                      <SelectLabel className="font-bold text-amber-700 dark:text-amber-400">
                        Profit and Loss
                      </SelectLabel>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expenses">Expenses</SelectItem>
                      <SelectItem value="other_expenses">Other Expenses</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {formError.type ? (
                  <p className="text-xs text-destructive">{formError.type}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setAccountName("");
                  setSelectedTypeKey("");
                  setFormError({});
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={createMutation.isPending}
                onClick={handleConfirm}
              >
                <Check className="size-4" />
                {createMutation.isPending ? "Confirming..." : "Confirm & Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Table View matching wireframe ─── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[60%] font-semibold text-foreground">
                  Account Name
                </TableHead>
                <TableHead className="w-[30%] font-semibold text-foreground">
                  Type
                </TableHead>
                <TableHead className="w-[10%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-xs text-muted-foreground"
                  >
                    Loading chart of accounts...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No accounts found. Click{" "}
                    <span className="font-semibold text-foreground">"New"</span> to
                    create one.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className={`transition-colors ${
                      account.isArchived ? "opacity-60 bg-muted/20" : ""
                    }`}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{account.name}</span>
                        {account.isArchived ? (
                          <Badge
                            variant="destructive"
                            className="gap-1 text-[10px] leading-none"
                          >
                            <Archive className="size-2.5" />
                            Archived
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(account.type)}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={account.isArchived ? "Unarchive" : "Archive"}
                          onClick={() => setTargetAccount(account)}
                          className="size-7"
                        >
                          {account.isArchived ? (
                            <ArchiveRestore className="size-3.5 text-muted-foreground hover:text-foreground" />
                          ) : (
                            <Archive className="size-3.5 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Archive Confirmation Dialog ─── */}
      <AlertDialog
        open={Boolean(targetAccount)}
        onOpenChange={(open) => !open && setTargetAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetAccount?.isArchived ? "Unarchive" : "Archive"} account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetAccount?.isArchived
                ? `Account "${targetAccount?.name}" will be restored and available for posting entries.`
                : `Account "${targetAccount?.name}" will be archived and hidden from transaction pickers. Past journal entries remain intact.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (targetAccount) archiveMutation.mutate(targetAccount);
              }}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
