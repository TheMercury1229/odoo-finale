import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DataTableProps {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable({
  children,
  isLoading,
  isError,
  errorMessage = "Unable to load data. Please try again.",
  isEmpty,
  emptyState,
  className,
}: DataTableProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : isEmpty ? (
          emptyState
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
