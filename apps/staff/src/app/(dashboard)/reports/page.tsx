"use client";

import Link from "next/link";
import { TrendingUp, Users, LogIn, Award } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useRevenueReport, useMemberReport } from "@/hooks/use-reports";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

const REPORT_CARDS = [
  { href: "/reports/revenue",    icon: TrendingUp, label: "Revenue",    desc: "Daily trend, plan/mode breakdown, GST summary" },
  { href: "/reports/members",    icon: Users,       label: "Members",   desc: "Status counts, signups, churn, cohort retention" },
  { href: "/reports/attendance", icon: LogIn,       label: "Attendance","desc": "Daily trend, peak-hour heatmap, at-risk members" },
  { href: "/reports/trainers",   icon: Award,       label: "Trainers",  desc: "Members per trainer, commission, retention" },
];

export default function ReportsPage() {
  const { data: revenue } = useRevenueReport("mtd");
  const { data: members } = useMemberReport("mtd");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Month-to-date overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "MTD Revenue",   value: revenue ? paiseToRupees(revenue.totalPaise) : "—",          sub: revenue?.growth != null ? `${revenue.growth > 0 ? "+" : ""}${revenue.growth}% vs prev` : "" },
          { label: "Active Members",value: members?.statusBreakdown.find((s) => s.status === "active")?.count.toString() ?? "—", sub: "" },
          { label: "New Signups",   value: members?.newSignups.toString() ?? "—",                       sub: "this period" },
          { label: "Churn Rate",    value: members ? `${members.churnRate}%` : "—",                     sub: "expired this period" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_CARDS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="pt-5 pb-5">
                <Icon className="h-7 w-7 text-primary mb-2.5" />
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
