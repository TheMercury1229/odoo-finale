import Image from "next/image";
import Link from "next/link";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { portalNav } from "@/lib/nav-config";
import { navIcons } from "@/lib/nav-icons";
import { PortalUserMenu } from "@/components/portal/portal-user-menu";

export function PortalHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/portal/invoices"
          className="flex shrink-0 items-center gap-2"
        >
          <Image src="/logo.svg" alt="" width={30} height={30} />
          <span className="hidden text-sm font-semibold tracking-wide sm:inline">
            Urban Furniture
          </span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {portalNav.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <Button
                key={item.url}
                variant="ghost"
                size="sm"
                render={<Link href={item.url} />}
              >
                <Icon data-icon="inline-start" />
                <span>{item.title}</span>
              </Button>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ModeToggle />
          <PortalUserMenu />
        </div>
      </div>
    </header>
  );
}
