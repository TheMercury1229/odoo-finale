import Image from "next/image";
import Link from "next/link";

import { ModeToggle } from "@/components/ui/mode-toggle";

export function AuthTopbar() {
  return (
    <header className="flex items-center justify-between border-b border-border/70 px-5 py-3 sm:px-8 lg:px-10">
      <Link
        href="/"
        aria-label="Go to home"
        className="inline-flex items-center gap-3"
      >
        <Image src="/logo.svg" alt="" width={40} height={40} priority />
        <span className="text-sm font-semibold tracking-[0.18em] text-foreground uppercase">
          Urban Furniture
        </span>
      </Link>
      <ModeToggle />
    </header>
  );
}
