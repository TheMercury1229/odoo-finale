"use client";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { useEffect, useState } from "react";
import { extractRouterConfig } from "uploadthing/server";

import { ourFileRouter } from "@/app/api/uploadthing/core";
import { authClient } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const defaultOrganizationId = "org_urban_furniture";

function ActiveOrganizationInitializer() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.user || session.session.activeOrganizationId) return;

    void authClient.organization.setActive({
      organizationId: defaultOrganizationId,
    });
  }, [session]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <ActiveOrganizationInitializer />
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
