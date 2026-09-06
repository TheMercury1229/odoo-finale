"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Scale, Target, TrendingUp } from "lucide-react";

export const REPORT_TABS = [
  {
    label: "Balance Sheet",
    href: "/reports/balance-sheet",
    icon: Scale,
  },
  {
    label: "Profit & Loss",
    href: "/reports/profit-loss",
    icon: TrendingUp,
  },
  {
    label: "Budget Performance",
    href: "/reports/budget",
    icon: Target,
  },
  {
    label: "Stock & Inventory",
    href: "/reports/stock",
    icon: Boxes,
  },
] as const;

export function ReportsNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 overflow-x-auto print:hidden">
      {REPORT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
