"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, CreditCard,
  Shield, BarChart3, Flag, Activity, Settings, Ticket,
} from "lucide-react";
import { cn } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/gyms", label: "Gyms", icon: Building2 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/onboarding", label: "Onboarding", icon: Users },
  { href: "/support", label: "Support", icon: Ticket },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/flags", label: "Feature Flags", icon: Flag },
  { href: "/infra", label: "Infrastructure", icon: Activity },
  { href: "/compliance", label: "Compliance", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("platform_user_email")) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <Shield className="h-5 w-5 text-primary mr-2" />
          <span className="font-bold">GrwFit Platform</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-xs text-center text-muted-foreground">
          Platform Admin v1.0
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b bg-card px-6 justify-between">
          <h1 className="font-semibold">GrwFit Platform Dashboard</h1>
          <button
            onClick={async () => {
              try { await apiClient.post("/admin/auth/logout"); } catch { /* ignore */ }
              sessionStorage.removeItem("platform_user_email");
              router.replace("/login");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
