"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { fetchJournalEntries, type JournalEntry } from "./journal-entries-api";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
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

export function JournalEntriesView() {
  const router = useRouter();
  const { canCreateTransaction } = useUserPermissions();

  // Search and filter states
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: journalEntries = [], isLoading } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: () => fetchJournalEntries(),
  });

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "purchases", label: "Purchases" },
    { id: "sales", label: "Sales" },
    { id: "bank_cash", label: "Bank & Cash" },
    { id: "manual", label: "Manual Entries" },
  ];

  // Filter logic
  const filteredEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      // 1. Search filter
      if (searchInput.trim()) {
        const q = searchInput.trim().toLowerCase();
        const matchesNumber = entry.number?.toLowerCase().includes(q);
        const matchesPartner = entry.partner?.toLowerCase().includes(q);
        const matchesJournal = entry.journalName?.toLowerCase().includes(q);
        const matchesRef = entry.reference?.toLowerCase().includes(q);
        if (
          !matchesNumber &&
          !matchesPartner &&
          !matchesJournal &&
          !matchesRef
        ) {
          return false;
        }
      }

      // 2. Category filter (via pills)
      if (selectedCategory !== "all") {
        const jName = (entry.journalName || "").toLowerCase();
        const sType = entry.sourceType;

        if (selectedCategory === "purchases") {
          const isPurchase =
            jName.includes("purchase") ||
            jName.includes("bill") ||
            sType === "vendor_bill";
          if (!isPurchase) return false;
        } else if (selectedCategory === "sales") {
          const isSales =
            jName.includes("sale") ||
            jName.includes("inv") ||
            sType === "customer_invoice";
          if (!isSales) return false;
        } else if (selectedCategory === "bank_cash") {
          const isBankCash =
            jName.includes("bank") ||
            jName.includes("cash") ||
            sType === "payment";
          if (!isBankCash) return false;
        } else if (selectedCategory === "manual") {
          if (sType !== "manual") return false;
        }
      }

      // 3. Status filter
      if (selectedStatus !== "all") {
        if (entry.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [journalEntries, searchInput, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedStatus !== "all";

  function clearAllFilters() {
    setSearchInput("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-1 sm:p-4">
      {/* ─── Top Bar: "New" on left, "Back" on right (per mockup) ─── */}
      <div className="flex items-center justify-between border-b pb-4">
        {canCreateTransaction ? (
          <Button
            type="button"
            onClick={() => router.push("/journal-entries/new")}
            className="rounded-lg px-4 py-2 font-medium shadow-sm transition-all hover:shadow"
          >
            <Plus className="mr-1.5 size-4" />
            New
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2 font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </div>

      {/* ─── Header Title & Counter ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Journal Entries
            </h1>
            {!isLoading && (
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredEntries.length}
                {filteredEntries.length !== journalEntries.length &&
                  ` of ${journalEntries.length}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ─── Search & Category Filters Toolbar ─── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by number, partner, reference..."
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="w-full sm:w-36">
            <Select
              value={selectedStatus}
              onValueChange={(val) => setSelectedStatus(val ?? "all")}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* ─── Category Filter Pills ─── */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 mr-1 font-medium">
            <SlidersHorizontal className="size-3.5" />
            Categories:
          </span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Journal Entries Table (Matches Mockup) ─── */}
      <Card className="shadow-xs border border-border/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground w-[15%]">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-foreground w-[22%]">
                  Number
                </TableHead>
                <TableHead className="font-semibold text-foreground w-[20%]">
                  Partner
                </TableHead>
                <TableHead className="font-semibold text-foreground w-[18%]">
                  Journal
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right w-[15%]">
                  Total
                </TableHead>
                <TableHead className="font-semibold text-foreground text-center w-[10%]">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Loading journal entries...
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <span>
                          No journal entries match your search or filters.
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="mt-1"
                        >
                          Clear all filters
                        </Button>
                      </div>
                    ) : (
                      <div>
                        No journal entries found. Click{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/journal-entries/new")}
                          className="font-semibold text-primary underline underline-offset-4"
                        >
                          "New"
                        </button>{" "}
                        to create one.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry: JournalEntry) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[#714b67] dark:text-purple-300">
                      {entry.number}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {entry.partner || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.journalName || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(entry.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={entry.status || "Posted"} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
