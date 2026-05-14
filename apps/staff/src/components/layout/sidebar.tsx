"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, LogIn, TrendingUp,
  FileText, UserCog, Settings, Dumbbell, Globe, Maximize2, RefreshCw, Award, Calendar,
} from "lucide-react";
import { cn } from "@grwfit/ui";
import { usePermission } from "@/hooks/use-permission";

const navItems = [
  { href: "/dashboard",       label: "Dashboard",  icon: LayoutDashboard, module: "dashboard"   as const },
  { href: "/members",         label: "Members",    icon: Users,           module: "members"     as const },
  { href: "/checkins",        label: "Check-ins",  icon: LogIn,           module: "checkins"    as const },
  { href: "/checkins/kiosk",  label: "Kiosk Mode", icon: Maximize2,       module: "checkins"    as const },
  { href: "/renewals",        label: "Renewals",   icon: RefreshCw,       module: "members"     as const },
  { href: "/leads",           label: "Leads",      icon: TrendingUp,      module: "leads"       as const },
  { href: "/trainers",        label: "Trainers",   icon: Award,           module: "staff_mgmt"  as const },
  { href: "/classes",         label: "Classes",    icon: Calendar,        module: "checkins"    as const },
  { href: "/reports",         label: "Reports",    icon: FileText,        module: "reports"     as const },
  { href: "/compliance",      label: "Compliance", icon: FileText,        module: "reports"     as const },
  { href: "/staff",           label: "Staff",      icon: UserCog,         module: "staff_mgmt"  as const },
  { href: "/website",         label: "Website",    icon: Globe,           module: "website_cms" as const },
  { href: "/settings",        label: "Settings",   icon: Settings,        module: "dashboard"   as const },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">GrwFit</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground text-center">GrwFit v1.0</p>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  const canView = usePermission(item.module, "view");
  if (!canView) return null;

  const Icon = item.icon;
  return (
    <Link
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
}
