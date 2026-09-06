"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Edit2,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import axios from "axios";

import {
  type AnalyticAccount,
  fetchAnalyticAccounts,
  setAnalyticAccountArchived,
} from "./analytic-accounts-api";
import { TablePagination } from "@/components/primitives/TablePagination";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { useUserPermissions } from "@/lib/use-user-permissions";

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function AnalyticAccountsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, canCreateMasterData } = useUserPermissions();

  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, showArchived]);

  const [targetAccount, setTargetAccount] = useState<AnalyticAccount | null>(
    null,
  );

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["analytic-accounts", showArchived, searchQuery, typeFilter],
    queryFn: () =>
      fetchAnalyticAccounts({
        includeArchived: showArchived,
        search: searchQuery || undefined,
        type: typeFilter === "all" ? undefined : typeFilter,
      }),
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAccounts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return accounts.slice(start, start + PAGE_SIZE);
  }, [accounts, safeCurrentPage]);

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setAnalyticAccountArchived(id, archived),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["analytic-accounts"] });
      toast.add({
        type: "success",
        title: variables.archived
          ? "Analytic account archived"
          : "Analytic account unarchived",
      });
      setTargetAccount(null);
    },
    onError: (err: unknown) => {
      let msg = "Failed to update account status.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      }
      toast.add({
        type: "error",
        title: msg,
      });
    },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Tags className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Analytic Accounts
            </h1>
            <p className="text-sm text-muted-foreground">
              Cost centers, project tags, and revenue channels for financial
              tracking and budgets.
            </p>
          </div>
        </div>

        {canCreateMasterData && (
          <Button
            onClick={() => router.push("/analytic-accounts/new")}
            className="gap-2 font-medium"
          >
            <Plus className="size-4" />
            New Analytic Account
          </Button>
        )}
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val || "all")}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="gap-2 h-9"
            >
              <SlidersHorizontal className="size-3.5" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Table ─── */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground">
                Account Name
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Type
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Created
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner className="size-6 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      Loading analytic accounts...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-48 text-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="rounded-full bg-muted p-3">
                      <Tags className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        No analytic accounts found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery
                          ? "Try modifying your search or filter."
                          : "Get started by creating your first analytic account."}
                      </p>
                    </div>
                    {canCreateMasterData && !searchQuery && (
                      <Button
                        size="sm"
                        onClick={() => router.push("/analytic-accounts/new")}
                        className="gap-2 mt-1"
                      >
                        <Plus className="size-4" />
                        Create Account
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAccounts.map((acc) => (
                <TableRow
                  key={acc.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/analytic-accounts/${acc.id}`)}
                >
                  <TableCell className="font-medium text-foreground">
                    {acc.name}
                  </TableCell>
                  <TableCell>
                    {acc.type === "income" ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 capitalize text-xs font-medium"
                      >
                        Income
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 capitalize text-xs font-medium"
                      >
                        Expense
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {acc.isArchived ? (
                      <Badge
                        variant="destructive"
                        className="text-xs font-medium"
                      >
                        Archived
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(acc.createdAt)}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          router.push(`/analytic-accounts/${acc.id}`)
                        }
                        title="Edit Account"
                      >
                        <Edit2 className="size-4 text-muted-foreground" />
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setTargetAccount(acc)}
                          title={
                            acc.isArchived
                              ? "Unarchive Account"
                              : "Archive Account"
                          }
                        >
                          {acc.isArchived ? (
                            <ArchiveRestore className="size-4 text-emerald-600" />
                          ) : (
                            <Archive className="size-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && accounts.length > 0 && (
          <TablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={accounts.length}
            pageSize={PAGE_SIZE}
            itemLabel="analytic accounts"
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* ─── Archive / Unarchive Confirmation Dialog ─── */}
      <AlertDialog
        open={Boolean(targetAccount)}
        onOpenChange={(open) => !open && setTargetAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetAccount?.isArchived
                ? "Unarchive Analytic Account?"
                : "Archive Analytic Account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetAccount?.isArchived
                ? `This will restore "${targetAccount?.name}" so it can be tagged in journal entries and linked to budgets.`
                : `This will archive "${targetAccount?.name}". Existing journal entry tags remain, but it will be hidden from new selections.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (targetAccount) {
                  archiveMutation.mutate({
                    id: targetAccount.id,
                    archived: !targetAccount.isArchived,
                  });
                }
              }}
              disabled={archiveMutation.isPending}
              className={
                targetAccount?.isArchived
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {archiveMutation.isPending ? (
                <Spinner className="size-4" />
              ) : targetAccount?.isArchived ? (
                "Unarchive"
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
