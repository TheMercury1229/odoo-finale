"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  type JournalType,
  fetchJournals,
  journalTypeLabels,
} from "@/components/dashboard/journals/journals-api";
import { JournalCreateDialog } from "@/components/dashboard/journals/journal-create-dialog";
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
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: fetchJournals,
  });

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* ─── Top Bar: "New" on left, "Back" on right ─── */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* ─── Header Title ─── */}
      <div>
        <div className="flex items-center gap-2">
          <BookText className="size-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Journals
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Journals organize transactions into distinct accounting categories.
        </p>
      </div>

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
                journals.map((j) => (
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
        </CardContent>
      </Card>

      {/* ─── Create Journal Dialog ─── */}
      <JournalCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
