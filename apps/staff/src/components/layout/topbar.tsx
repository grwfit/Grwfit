"use client";

import { Bell, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@grwfit/ui";
import { useAuth } from "@/providers/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground" />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <div className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-accent cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role ?? ""}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <Button variant="ghost" size="icon" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
