"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  LayoutGrid,
  List,
  PiggyBank,
  Plus,
  Search,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { type Budget, type BudgetStatus, fetchBudgets } from "./budgets-api";
import { formatCurrency } from "../reports/reports-api";
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

function formatDateDMY(dateStr?: string | null) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function BudgetStatusBadge({ status }: { status: BudgetStatus | string }) {
  switch (status) {
    case "draft":
      return (
        <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Draft
        </span>
      );
    case "confirmed":
      return (
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          Confirmed
        </span>
      );
    case "revised":
      return (
        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
          Revised
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          Cancelled
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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
      { name: "Balance", value: balance, color: "#f43f5e" },  // rose-500
    ];
  }, [achieved, balance, committedAmount]);

  const percent =
    committedAmount > 0
      ? Math.min(100, Math.round((achieved / committedAmount) * 100))
      : 0;

  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="size-10 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(val: any, name: any) => [
                formatCurrency(Number(val)),
                name,
              ]}
              contentStyle={{
                fontSize: "11px",
                borderRadius: "6px",
                padding: "4px 8px",
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={8}
              outerRadius={18}
              strokeWidth={1}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col text-[11px] leading-snug">
        <span className="flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
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

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
  });

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-2 sm:p-4">
      {/* ─── Top Bar matching Mockup (New | Search | Back | View Switch) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/budgets/new")}
            className="gap-1.5 font-medium shadow-xs"
          >
            <Plus className="size-4" />
            New
          </Button>
        </div>

        {/* Center Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search budgets, responsible, analytics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Right Actions: Back & View Switchers */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-1.5 h-9 text-xs"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>

          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setViewMode("kanban")}
              title="Kanban View"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>
      </div>

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
              <h3 className="font-semibold text-foreground">No Budgets Found</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No budgets matching "${search}".`
                  : "Get started by creating your first budget."}
              </p>
            </div>
            {!search && (
              <Button
                onClick={() => router.push("/budgets/new")}
                className="mt-2 gap-2"
              >
                <Plus className="size-4" />
                Create Budget
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ─── LIST VIEW matching wireframe ─── */
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
              {filteredBudgets.map((b) => {
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
                      {formatDateDMY(b.periodStart)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDMY(b.periodEnd)}
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
        </Card>
      ) : (
        /* ─── KANBAN VIEW matching wireframe ─── */
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
                      <span>{formatDateDMY(b.periodStart)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/80 min-w-18">
                        End Date
                      </span>
                      <span>{formatDateDMY(b.periodEnd)}</span>
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
