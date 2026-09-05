"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, PiggyBank } from "lucide-react";

import { fetchBudget } from "@/components/dashboard/budgets/budgets-api";
import { BudgetForm } from "@/components/dashboard/budgets/budget-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditBudgetPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const {
    data: budget,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["budget", id],
    queryFn: () => fetchBudget(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading budget...</p>
      </div>
    );
  }

  if (isError || !budget) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <PiggyBank className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Budget Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The budget you are trying to view or edit does not exist.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/budgets")}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Budgets
        </Button>
      </div>
    );
  }

  return <BudgetForm initialData={budget} />;
}
