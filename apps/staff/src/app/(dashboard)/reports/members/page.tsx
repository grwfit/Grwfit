"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { useMemberReport, useCohortRetention } from "@/hooks/use-reports";
import type { DatePreset } from "@/components/reports/date-range-filter";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", expired: "#ef4444", frozen: "#6366f1", trial: "#f59e0b",
};
const PIE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b"];

const GENDER_LABELS: Record<string, string> = {
  male: "Male", female: "Female", other: "Other", prefer_not_to_say: "N/A", unknown: "Unknown",
};

export default function MemberReportPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();

  const { data, isLoading } = useMemberReport(preset, from, to);
  const { data: cohort } = useCohortRetention(6);

  // Build cohort grid: unique months as rows, period 0–5 as columns
  const cohortMonths = [...new Set(cohort?.map((r) => r.cohortMonth) ?? [])].sort();
  const maxPeriod = Math.max(...(cohort?.map((r) => r.periodMonth) ?? [0]), 5);
  const cohortMap = new Map(cohort?.map((r) => [`${r.cohortMonth}-${r.periodMonth}`, r.count]) ?? []);
  const cohortBaseMap = new Map(cohort?.filter((r) => r.periodMonth === 0).map((r) => [r.cohortMonth, r.count]) ?? []);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Member Report</h1>
      </div>

      <DateRangeFilter
        preset={preset}
        from={from}
        to={to}
        onPresetChange={setPreset}
        onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Members",  value: data?.total },
          { label: "New Signups",    value: data?.newSignups },
          { label: "Churned",        value: data?.churnedCount },
          { label: "Churn Rate",     value: data ? `${data.churnRate}%` : undefined },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signup trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">New Signups Over Time</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-44 bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data?.signupSeries ?? []}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(new Date(d), "dd MMM")} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")} contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#signupGrad)" name="New Members" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Status + Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Member Status</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={140}>
              <PieChart>
                <Pie data={data?.statusBreakdown ?? []} dataKey="count" nameKey="status" innerRadius={35} outerRadius={60}>
                  {(data?.statusBreakdown ?? []).map((r) => (
                    <Cell key={r.status} fill={STATUS_COLORS[r.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 text-xs">
              {(data?.statusBreakdown ?? []).map((r) => (
                <div key={r.status} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[r.status] ?? "#94a3b8" }} />
                  <span className="capitalize">{r.status}</span>
                  <span className="ml-auto font-medium">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Gender Demographics</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={(data?.genderBreakdown ?? []).map((r) => ({ ...r, label: GENDER_LABELS[r.gender] ?? r.gender }))}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Members" radius={4}>
                  {(data?.genderBreakdown ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cohort retention */}
      {cohortMonths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cohort Retention (%)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground border-b">Cohort</th>
                  {Array.from({ length: maxPeriod + 1 }, (_, i) => (
                    <th key={i} className="p-2 font-medium text-muted-foreground border-b">M{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortMonths.map((month) => {
                  const base = cohortBaseMap.get(month) ?? 0;
                  return (
                    <tr key={month} className="border-b">
                      <td className="p-2 font-medium">{format(new Date(month + "-01"), "MMM yyyy")}</td>
                      {Array.from({ length: maxPeriod + 1 }, (_, i) => {
                        const count = cohortMap.get(`${month}-${i}`) ?? 0;
                        const pct = base > 0 ? Math.round((count / base) * 100) : 0;
                        const opacity = pct > 0 ? 0.15 + (pct / 100) * 0.7 : 0;
                        return (
                          <td key={i} className="p-2 text-center" style={{ background: `rgba(99,102,241,${opacity})` }}>
                            {count > 0 ? `${pct}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
