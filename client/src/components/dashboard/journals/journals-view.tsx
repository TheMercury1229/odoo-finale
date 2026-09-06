"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { TablePagination } from "@/components/primitives/TablePagination";

import {
  type JournalType,
  fetchJournals,
  journalTypeLabels,
} from "@/components/dashboard/journals/journals-api";
import { JournalCreateDialog } from "@/components/dashboard/journals/journal-create-dialog";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function JournalsView() {
  const { canCreateMasterData } = useUserPermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: fetchJournals,
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(journals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedJournals = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return journals.slice(start, start + PAGE_SIZE);
  }, [journals, safeCurrentPage]);

  function getTypeBadge(type: JournalType) {
    switch (type) {
      case "sales":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium"
          >
            {journalTypeLabels.sales}
          </Badge>
        );
      case "purchase":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
          >
            {journalTypeLabels.purchase}
          </Badge>
        );
      case "bank":
        return (
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
          >
            {journalTypeLabels.bank}
          </Badge>
        );
      case "cash":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
          >
            {journalTypeLabels.cash}
          </Badge>
        );
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Header matching Contacts/Products pattern ─── */}
      <PageHeader
        title="Journals"
        description="Journals organize transactions into distinct accounting categories."
        actions={
          <div className="flex items-center gap-2">
            {!isLoading && journals.length > 0 ? (
              <Badge variant="secondary" className="h-7 px-2.5">
                {journals.length}
              </Badge>
            ) : null}
            {canCreateMasterData && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                New
              </Button>
            )}
          </div>
        }
      />

      {/* ─── Journals Table ─── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[45%] font-semibold text-foreground">
                  Journal Name
                </TableHead>
                <TableHead className="w-[25%] font-semibold text-foreground">
                  Type
                </TableHead>
                <TableHead className="w-[30%] font-semibold text-foreground">
                  Default Account
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-xs text-muted-foreground"
                  >
                    Loading journals...
                  </TableCell>
                </TableRow>
              ) : journals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No journals found. Click{" "}
                    <span className="font-semibold text-foreground">"New"</span> to
                    create one.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedJournals.map((j) => (
                  <TableRow key={j.id} className="transition-colors">
                    <TableCell className="font-medium text-foreground">
                      {j.name}
                    </TableCell>
                    <TableCell>{getTypeBadge(j.type)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.defaultAccount?.accountName ? (
                        <span className="font-medium text-foreground">
                          {j.defaultAccount.accountName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!isLoading && journals.length > 0 && (
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={journals.length}
              pageSize={PAGE_SIZE}
              itemLabel="journals"
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      {/* ─── Create Journal Dialog ─── */}
      <JournalCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
