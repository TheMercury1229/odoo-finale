"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        router.replace("/signin");
      } else if (session.user.role === "contact") {
        router.replace("/portal/invoices");
      } else {
        router.replace("/contacts");
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <div className="flex items-center gap-3">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Loading Urban Furniture Accounting...
        </span>
      </div>
    </div>
  );
}
