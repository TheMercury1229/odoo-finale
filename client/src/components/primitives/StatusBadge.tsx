import { Badge } from "@/components/ui/badge";

export const STATUS_CONFIG = {
  Draft: { label: "Draft", variant: "secondary" as const },
  Confirmed: { label: "Confirmed", variant: "default" as const },
  Posted: {
    label: "Posted",
    variant: "default" as const,
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  Paid: {
    label: "Paid",
    variant: "default" as const,
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  Partial: {
    label: "Partial",
    variant: "outline" as const,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  "Not Paid": {
    label: "Not Paid",
    variant: "destructive" as const,
  },
  Revised: {
    label: "Revised",
    variant: "outline" as const,
    className: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  },
  Cancelled: { label: "Cancelled", variant: "destructive" as const },
  "In Stock": { label: "In Stock", variant: "default" as const },
  "Low Stock": { label: "Low Stock", variant: "outline" as const },
  "Out of Stock": { label: "Out of Stock", variant: "destructive" as const },
} as const;

export type StatusValue = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusValue] ?? {
    label: status,
    variant: "outline" as const,
  };

  return (
    <Badge
      variant={config.variant}
      className={"className" in config ? config.className : className}
    >
      {config.label}
    </Badge>
  );
}
