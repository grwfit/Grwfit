"use client";

import { useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { useAttendanceReport } from "@/hooks/use-reports";
import type { DatePreset } from "@/components/reports/date-range-filter";
import { format } from "date-fns";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceReportPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();

  const { data, isLoading } = useAttendanceReport(preset, from, to);

  // Build heatmap: row = DOW, col = hour
  const heatmapMax = Math.max(...(data?.heatmap.map((r) => r.count) ?? [1]));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Attendance Report</h1>
      </div>

      <DateRangeFilter
        preset={preset} from={from} to={to}
        onPresetChange={setPreset}
        onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
      />

      {/* Daily check-in trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Check-ins</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-44 bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.dailySeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(new Date(d), "dd MMM")} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={2} name="Check-ins" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Peak hour heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Peak Hour Heatmap (Day × Hour)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <div className="h-32 bg-muted animate-pulse rounded" /> : (
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-10 text-muted-foreground p-1" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="w-7 text-center text-muted-foreground p-1 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOW_LABELS.map((day, dow) => (
                  <tr key={dow}>
                    <td className="text-muted-foreground p-1 font-medium text-right pr-2">{day}</td>
                    {Array.from({ length: 24 }, (_, h) => {
                      const entry = data?.heatmap.find((r) => r.dow === dow && r.hour === h);
                      const count = entry?.count ?? 0;
                      const opacity = heatmapMax > 0 && count > 0 ? 0.1 + (count / heatmapMax) * 0.85 : 0;
                      return (
                        <td
                          key={h}
                          title={count ? `${day} ${h}:00 — ${count} check-ins` : undefined}
                          className="p-0.5"
                        >
                          <div
                            className="h-5 w-5 rounded-sm"
                            style={{ background: count > 0 ? `rgba(99,102,241,${opacity})` : "transparent" }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Top members + At-risk side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Most Active Members</CardTitle></CardHeader>
          <CardContent>
            {(data?.topMembers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {data?.topMembers.map((m, i) => (
                  <div key={m.memberId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <span className="flex-1 text-sm">{m.name}</span>
                    <span className="text-sm font-medium">{m.count} visits</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              At-Risk (no check-in 14d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.atRisk ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">All members active!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.atRisk.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                    <a
                      href={`https://wa.me/${m.phone.replace("+", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-green-600 hover:underline shrink-0"
                    >
                      WhatsApp
                    </a>
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
