"use client";

import { Building2, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { usePlatformOverview } from "@/hooks/use-platform";
import { format } from "date-fns";

function paiseToRupees(p: number) {
  const r = p / 100;
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  return `₹${(r / 1000).toFixed(0)}K`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-700 bg-green-50",
  trial: "text-yellow-700 bg-yellow-50",
  suspended: "text-red-700 bg-red-50",
  churned: "text-gray-500 bg-gray-100",
};

export default function OverviewPage() {
  const { data, isLoading } = usePlatformOverview();

  const stats = [
    { label: "Total Gyms",       value: data?.totalGyms,                       icon: Building2, color: "text-blue-600" },
    { label: "Active Members",   value: data?.totalMembers?.toLocaleString(),   icon: Users,     color: "text-green-600" },
    { label: "MRR",              value: data ? paiseToRupees(data.mrrPaise) : "—", icon: TrendingUp, color: "text-purple-600" },
    { label: "ARR",              value: data ? paiseToRupees(data.arrPaise) : "—", icon: TrendingUp, color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        {data?.mrrGrowth != null && (
          <span className={`flex items-center gap-1 text-sm font-medium ${data.mrrGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
            {data.mrrGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {data.mrrGrowth > 0 ? "+" : ""}{data.mrrGrowth}% MoM
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold">{value ?? "—"}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gym Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Active", value: data?.activeGyms, s: "active" },
              { label: "Trial",  value: data?.trialGyms,  s: "trial" },
            ].map(({ label, value, s }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s]}`}>{label}</span>
                <span className="font-bold">{isLoading ? "…" : value ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Gym Signups</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
            ) : (
              <div className="space-y-2">
                {(data?.recentGyms ?? []).slice(0, 6).map((gym) => (
                  <div key={gym.id} className="flex items-center justify-between text-sm">
                    <a href={`/gyms/${gym.id}`} className="font-medium hover:underline truncate max-w-[180px]">
                      {gym.name}
                    </a>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[gym.status] ?? ""}`}>{gym.status}</span>
                      <span className="text-muted-foreground text-xs">{format(new Date(gym.createdAt), "dd MMM")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
