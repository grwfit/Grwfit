"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Maximize2, AlertTriangle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@grwfit/ui";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { useTodayCheckins, useNoShows, useHeatmap } from "@/hooks/use-checkins";
import type { NoShowEntry, TickerEntry } from "@/hooks/use-checkins";
import { formatDistanceToNow } from "date-fns";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`,
);

export default function CheckinsPage() {
  const router = useRouter();
  const [noShowDays, setNoShowDays] = useState(14);

  const { data: today, isLoading: loadingToday } = useTodayCheckins();
  const { data: heatmap, isLoading: loadingHeatmap } = useHeatmap(7);
  const { data: noShows, isLoading: loadingNoShows } = useNoShows(noShowDays);

  const tickerColumns: ColumnDef<TickerEntry>[] = [
    {
      key: "member",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {row.member.name.charAt(0)}
          </div>
          <span className="font-medium">{row.member.name}</span>
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.checkedInAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => (
        <span className="text-xs capitalize text-muted-foreground">{row.method}</span>
      ),
    },
  ];

  const noShowColumns: ColumnDef<NoShowEntry>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "last",
      header: "Last Check-in",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.last_checkin
            ? formatDistanceToNow(new Date(row.last_checkin), { addSuffix: true })
            : "Never"}
        </span>
      ),
    },
    {
      key: "absent",
      header: "Days Absent",
      render: (row) => (
        <span className={`text-sm font-medium ${row.days_absent >= 14 ? "text-destructive" : "text-orange-500"}`}>
          {row.days_absent}d
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-ins</h1>
          <p className="text-sm text-muted-foreground">Attendance tracking and reports</p>
        </div>
        <Button onClick={() => router.push("/checkins/kiosk")}>
          <Maximize2 className="h-4 w-4 mr-2" />
          Open Kiosk
        </Button>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <div>
              {loadingToday ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{today?.total ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground">Today&apos;s check-ins</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              {loadingNoShows ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold">{noShows?.length ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground">No-shows ({noShowDays}d)</p>
            </div>
          </CardContent>
        </Card>

        {today?.peakHour !== undefined && today?.peakHour !== null && (
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <span className="text-green-600 font-bold text-lg">{today.peakHour}</span>
              </div>
              <div>
                <p className="text-3xl font-bold">{today.peakHour}:00</p>
                <p className="text-sm text-muted-foreground">Today&apos;s peak hour</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Heatmap — Peak Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHeatmap ? (
            <Skeleton className="h-40 w-full" />
          ) : heatmap ? (
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {/* Day labels */}
                <div className="flex flex-col gap-1 mr-2">
                  <div className="h-5" /> {/* spacer for hour labels */}
                  {DAYS_OF_WEEK.map((d) => (
                    <div key={d} className="h-6 flex items-center text-xs text-muted-foreground w-8">{d}</div>
                  ))}
                </div>
                {/* Grid */}
                {HOURS.map((hour, h) => {
                  const maxVal = Math.max(...heatmap.grid.flatMap((row) => row));
                  return (
                    <div key={h} className="flex flex-col gap-1">
                      <div className="h-5 flex items-end text-xs text-muted-foreground w-6 text-center">{hour}</div>
                      {DAYS_OF_WEEK.map((_, d) => {
                        const val = heatmap.grid[d]?.[h] ?? 0;
                        const intensity = maxVal > 0 ? val / maxVal : 0;
                        return (
                          <div
                            key={d}
                            title={`${DAYS_OF_WEEK[d]} ${hour}: ${val}`}
                            className="h-6 w-6 rounded-sm transition-colors"
                            style={{
                              backgroundColor: intensity === 0
                                ? "hsl(var(--muted))"
                                : `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`,
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Today's check-ins list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Check-ins</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={tickerColumns}
            data={(today?.checkins ?? []) as TickerEntry[]}
            isLoading={loadingToday}
            rowKey={(r) => r.id}
            emptyIcon={LogIn}
            emptyTitle="No check-ins today"
            emptyDescription="Check-ins will appear here in real time."
          />
        </CardContent>
      </Card>

      {/* No-show list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> At-Risk Members
          </CardTitle>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={noShowDays}
            onChange={(e) => setNoShowDays(parseInt(e.target.value, 10))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={noShowColumns}
            data={noShows ?? []}
            isLoading={loadingNoShows}
            rowKey={(r) => r.id}
            emptyIcon={AlertTriangle}
            emptyTitle="No at-risk members"
            emptyDescription="All active members have checked in recently."
          />
        </CardContent>
      </Card>
    </div>
  );
}
