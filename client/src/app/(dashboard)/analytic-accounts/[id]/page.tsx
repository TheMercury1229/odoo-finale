"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Tags } from "lucide-react";

import { fetchAnalyticAccount } from "@/components/dashboard/analytic-accounts/analytic-accounts-api";
import { AnalyticAccountForm } from "@/components/dashboard/analytic-accounts/analytic-account-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAnalyticAccountPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const {
    data: account,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["analytic-account", id],
    queryFn: () => fetchAnalyticAccount(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading analytic account...
        </p>
      </div>
    );
  }

  if (isError || !account) {
    return (
      <div className="mx-auto flex w-full  flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Tags className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Analytic Account Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The account you are trying to edit does not exist or has been
            removed.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/analytic-accounts")}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Analytic Accounts
        </Button>
      </div>
    );
  }

  return <AnalyticAccountForm initialData={account} />;
}
