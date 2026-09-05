"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth";
import { ImageUploader } from "@/components/uploadthing/image-uploader";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardUserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const displayName = user?.name || (isPending ? "Loading..." : "Account");

  async function handleLogout() {
    await authClient.signOut();
    router.replace("/signin");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="h-12">
            <Avatar size="sm">
              <AvatarImage src={user?.image || undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {user?.email || ""}
              </span>
            </span>
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent align="end" side="top" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut />
            Log out
          </DropdownMenuItem>

        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
