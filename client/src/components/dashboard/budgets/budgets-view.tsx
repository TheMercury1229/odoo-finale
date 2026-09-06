"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Columns3,
  List,
  PiggyBank,
  Plus,
  Search,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { type Budget, type BudgetStatus, fetchBudgets } from "./budgets-api";
import { formatCurrency } from "../reports/reports-api";
import { PageHeader } from "@/components/primitives/PageHeader";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { TablePagination } from "@/components/primitives/TablePagination";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BudgetStatusBadge({
  status,
}: {
  status: BudgetStatus | string;
}) {
  const labels: Record<string, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    revised: "Revised",
    cancelled: "Cancelled",
  };
  return <StatusBadge status={labels[status] || status} />;
}

interface MiniPieProps {
  committedAmount: number;
  achievedAmount: number;
}

function MiniPieChart({ committedAmount, achievedAmount }: MiniPieProps) {
  const achieved = Math.max(0, achievedAmount);
  const balance = Math.max(0, committedAmount - achieved);

  const data = useMemo(() => {
    if (committedAmount <= 0 && achieved <= 0) {
      return [{ name: "None", value: 1, color: "#cbd5e1" }];
    }
    return [
      { name: "Achieved", value: achieved, color: "#0ea5e9" }, // sky-500
      { name: "Remaining", value: balance, color: "#f43f5e" }, // rose-500
    ];
  }, [committedAmount, achieved, balance]);

  const percent =
    committedAmount > 0
      ? Math.min(100, Math.round((achieved / committedAmount) * 100))
      : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="size-9 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(val: any, name: any) => [
                formatCurrency(Number(val)),
                name,
              ]}
              contentStyle={{
                borderRadius: "8px",
                fontSize: "11px",
                padding: "4px 8px",
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              innerRadius={10}
              outerRadius={16}
              strokeWidth={1}
              stroke="hsl(var(--background))"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col text-[11px] font-mono leading-tight">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <span className="inline-block size-1.5 rounded-full bg-sky-500" />
          {formatCurrency(achieved)} ({percent}%)
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-rose-500" />
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
}

export function BudgetsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        (b.responsibleContactName &&
          b.responsibleContactName.toLowerCase().includes(q)) ||
        (b.analyticAccountName &&
          b.analyticAccountName.toLowerCase().includes(q)) ||
        b.status.toLowerCase().includes(q)
      );
    });
  }, [budgets, search]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredBudgets.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBudgets = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredBudgets.slice(start, start + PAGE_SIZE);
  }, [filteredBudgets, safeCurrentPage]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* ─── Top bar matching Master Data pattern ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button nativeButton={false} render={<Link href="/budgets/new" />}>
          <Plus data-icon="inline-start" />
          New
        </Button>
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search budgets, responsible, analytics..."
            aria-label="Search budgets"
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            <List />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Kanban view"
            aria-pressed={viewMode === "kanban"}
            onClick={() => setViewMode("kanban")}
          >
            <Columns3 />
          </Button>
        </div>
      </div>

      {/* ─── Heading row matching Master Data pattern ─── */}
      <PageHeader
        title="Budgets"
        actions={
          <>
            {!isLoading && budgets.length > 0 ? (
              <Badge variant="secondary">{budgets.length}</Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/reports/budget" />}
            >
              Performance Report
            </Button>
          </>
        }
      />

      {/* ─── Main Content ─── */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading budgets...</p>
        </div>
      ) : filteredBudgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PiggyBank className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                No Budgets Found
              </h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No budgets matching "${search}".`
                  : "Get started by creating your first budget."}
              </p>
            </div>
            {!search && (
              <Button
                nativeButton={false}
                render={<Link href="/budgets/new" />}
                className="mt-2"
              >
                <Plus data-icon="inline-start" />
                Create Budget
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ─── LIST VIEW ─── */
        <Card className="overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[30%]">Budget</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[28%]">Pie Chart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBudgets.map((b) => {
                const isConfirmedOrRevised =
                  b.status === "confirmed" || b.status === "revised";

                return (
                  <TableRow
                    key={b.id}
                    onClick={() => router.push(`/budgets/${b.id}`)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold hover:underline">
                          {b.name}
                        </span>
                        {b.analyticAccountName && (
                          <span className="text-xs text-muted-foreground">
                            {b.analyticAccountName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(b.periodStart)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(b.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <BudgetStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      {isConfirmedOrRevised && b.committedAmount ? (
                        <MiniPieChart
                          committedAmount={Number(b.committedAmount) || 0}
                          achievedAmount={Number(b.achievedAmount) || 0}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {!isLoading && filteredBudgets.length > 0 && (
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredBudgets.length}
              pageSize={PAGE_SIZE}
              itemLabel="budgets"
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      ) : (
        /* ─── KANBAN VIEW ─── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((b) => {
            const isConfirmedOrRevised =
              b.status === "confirmed" || b.status === "revised";

            return (
              <Card
                key={b.id}
                onClick={() => router.push(`/budgets/${b.id}`)}
                className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                      {b.name}
                    </h4>
                    <BudgetStatusBadge status={b.status} />
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/80 min-w-18">
                        Start Date
                      </span>
                      <span>{formatDate(b.periodStart)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/80 min-w-18">
                        End Date
                      </span>
                      <span>{formatDate(b.periodEnd)}</span>
                    </div>
                  </div>

                  <div className="mt-1 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {b.analyticAccountName || "Analytic Account"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(Number(b.committedAmount) || 0)}
                    </span>
                  </div>

                  {isConfirmedOrRevised && (
                    <div className="pt-1">
                      <MiniPieChart
                        committedAmount={Number(b.committedAmount) || 0}
                        achievedAmount={Number(b.achievedAmount) || 0}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
