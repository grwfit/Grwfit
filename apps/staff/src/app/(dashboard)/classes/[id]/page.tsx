"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, Clock, Users } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useClassInstance, useMarkAttendance } from "@/hooks/use-classes";
import { format } from "date-fns";

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: cls, isLoading } = useClassInstance(params.id);
  const markAttendance = useMarkAttendance();
  const [attended, setAttended] = useState<Set<string>>(new Set());

  const toggleAttended = (memberId: string) =>
    setAttended((prev) => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });

  const handleMarkAll = () => {
    if (!cls) return;
    const ids = cls.bookings.filter(b => b.status === "confirmed").map(b => b.member.id);
    setAttended(new Set(ids));
  };

  const handleSubmitAttendance = () => {
    if (!cls) return;
    markAttendance.mutate({ instanceId: params.id, memberIds: Array.from(attended) });
  };

  if (isLoading) {
    return <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
    </div>;
  }

  if (!cls) return null;

  const confirmedBookings = cls.bookings.filter(b => b.status === "confirmed");

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{cls.template.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(cls.startsAt), "EEE, dd MMM yyyy")} · {format(new Date(cls.startsAt), "HH:mm")} – {format(new Date(cls.endsAt), "HH:mm")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: "Booked", value: `${confirmedBookings.length}/${cls.capacity}` },
          { icon: Clock, label: "Duration", value: `${cls.template.durationMin}min` },
          { icon: Users, label: "Waitlist", value: cls.waitlist.length },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3 text-center">
              <Icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roster */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Roster</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleMarkAll}>Select All</Button>
            <Button size="sm" onClick={handleSubmitAttendance}
              disabled={markAttendance.isPending || attended.size === 0}>
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Mark Attended ({attended.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {confirmedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {confirmedBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => toggleAttended(b.member.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    attended.has(b.member.id) ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                  }`}
                >
                  <input type="checkbox" readOnly checked={attended.has(b.member.id)} className="h-4 w-4 accent-primary" />
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm shrink-0">
                    {b.member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{b.member.name}</p>
                    <p className="text-xs text-muted-foreground">{b.member.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waitlist */}
      {cls.waitlist.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Waitlist</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cls.waitlist.map((w) => (
                <div key={w.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 text-right font-mono">#{w.position}</span>
                  <p className="font-medium flex-1">{w.member.name}</p>
                  <p className="text-muted-foreground">{w.member.phone}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
