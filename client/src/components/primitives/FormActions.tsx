import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
