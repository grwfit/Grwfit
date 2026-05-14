"use client";

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@grwfit/ui";
import { LogIn, Flame } from "lucide-react";
import { useMemberCheckinHistory } from "@/hooks/use-checkins";
import { format, differenceInDays } from "date-fns";

export function AttendanceTab({ memberId }: { memberId: string }) {
  const { data: history, isLoading } = useMemberCheckinHistory(memberId);

  const streak = history ? calcStreak(history.map((h) => new Date(h.checkedInAt))) : 0;
  const thisMonth = history
    ? history.filter((h) => {
        const d = new Date(h.checkedInAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <div>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <p className="text-3xl font-bold">{streak}</p>
              )}
              <p className="text-sm text-muted-foreground">Day streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <LogIn className="h-8 w-8 text-primary" />
            <div>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <p className="text-3xl font-bold">{thisMonth}</p>
              )}
              <p className="text-sm text-muted-foreground">This month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History list */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Attendance</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (history?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No check-ins yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history?.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{format(new Date(h.checkedInAt), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(h.checkedInAt), "h:mm a")}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{h.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function calcStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let expected = today;

  for (const d of sorted) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = differenceInDays(expected, day);
    if (diff === 0) {
      // Same day as expected — already counted
    } else if (diff === 1) {
      streak++;
      expected = day;
    } else {
      break;
    }
  }

  return streak;
}
