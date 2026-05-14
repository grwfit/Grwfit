"use client";

import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { useRevenueReport } from "@/hooks/use-reports";
import type { DatePreset } from "@/components/reports/date-range-filter";
import { format } from "date-fns";

const MODE_LABELS: Record<string, string> = {
  upi: "UPI", cash: "Cash", card: "Card",
  bank_transfer: "Bank", razorpay: "Razorpay",
};

const PIE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];

function paiseToRupees(p: number) { return `₹${(p / 100).toLocaleString("en-IN")}`; }
function shortRupees(p: number) {
  const r = p / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(0)}K`;
  return `₹${r.toFixed(0)}`;
}

export default function RevenueReportPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();

  const { data, isLoading } = useRevenueReport(preset, from, to);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Revenue Report</h1>
      </div>

      <DateRangeFilter
        preset={preset}
        from={from}
        to={to}
        onPresetChange={setPreset}
        onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
        showCompare
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold mt-1">{data ? paiseToRupees(data.totalPaise) : "—"}</p>
            {data?.growth != null && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${data.growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                {data.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {data.growth > 0 ? "+" : ""}{data.growth}% vs prev period
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold mt-1">{data?.totalCount ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Avg per Transaction</p>
            <p className="text-2xl font-bold mt-1">
              {data && data.totalCount > 0 ? paiseToRupees(Math.round(data.totalPaise / data.totalCount)) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Revenue Trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.dailySeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(new Date(d), "dd MMM")} />
                <YAxis tickFormatter={shortRupees} tick={{ fontSize: 10 }} width={55} />
                <Tooltip
                  formatter={(v: number) => paiseToRupees(v)}
                  labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line type="monotone" dataKey="totalPaise" stroke="#6366f1" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Plan & Mode breakdown side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">By Plan</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="h-36 bg-muted animate-pulse rounded" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data?.byPlan ?? []} layout="vertical">
                  <XAxis type="number" tickFormatter={shortRupees} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="planName" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => paiseToRupees(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="totalPaise" fill="#6366f1" radius={3} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">By Payment Mode</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            {isLoading ? <div className="h-36 w-full bg-muted animate-pulse rounded" /> : (
              <>
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie data={data?.byMode ?? []} dataKey="totalPaise" nameKey="mode" innerRadius={40} outerRadius={65}>
                      {(data?.byMode ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => paiseToRupees(v)} contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs">
                  {(data?.byMode ?? []).map((r, i) => (
                    <div key={r.mode} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span>{MODE_LABELS[r.mode] ?? r.mode}</span>
                      <span className="ml-auto text-muted-foreground">{paiseToRupees(r.totalPaise)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
