"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, CreditCard, TrendingUp, User } from "lucide-react";

const NAV = [
  { href: "/home",       icon: Home,       label: "Home" },
  { href: "/plan",       icon: Dumbbell,   label: "Plan" },
  { href: "/membership", icon: CreditCard, label: "Membership" },
  { href: "/progress",   icon: TrendingUp, label: "Progress" },
  { href: "/profile",    icon: User,       label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex max-w-md mx-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={active ? "font-medium" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
