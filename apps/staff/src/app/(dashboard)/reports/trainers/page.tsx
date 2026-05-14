"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { useTrainerPerformanceReport } from "@/hooks/use-reports";
import type { DatePreset } from "@/components/reports/date-range-filter";

function paiseToRupees(p: number) { return `₹${(p / 100).toLocaleString("en-IN")}`; }

export default function TrainerReportPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<DatePreset>("30d");

  const { data, isLoading } = useTrainerPerformanceReport(preset);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Trainer Performance</h1>
      </div>

      <DateRangeFilter preset={preset} onPresetChange={setPreset} />

      {/* Members per trainer chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Members per Trainer</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-44 bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data ?? []} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="memberCount" fill="#6366f1" radius={3} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Commission chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Commission Earned (Period)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-44 bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data ?? []} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `₹${Math.round(v / 100)}`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => paiseToRupees(v)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="commissionPaise" fill="#8b5cf6" radius={3} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trainer</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Members</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Commission %</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : (data ?? []).map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-right">{row.memberCount}</td>
                  <td className="px-4 py-3 text-right">{row.commissionPct > 0 ? `${row.commissionPct}%` : "—"}</td>
                  <td className="px-4 py-3 text-right">{paiseToRupees(row.commissionPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
