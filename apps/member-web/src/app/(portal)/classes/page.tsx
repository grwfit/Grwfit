"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClassInstance {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  template: { name: string; durationMin: number };
  _count: { bookings: number; waitlist: number };
}

function useUpcomingClasses() {
  return useQuery({
    queryKey: ["member", "classes"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassInstance[] }>("/members/me/classes");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

function useBookClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      apiClient.post<{ data: { status: string; position?: number } }>("/members/me/classes/book", { instanceId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["member", "classes"] });
      const status = res.data.data.status;
      if (status === "waitlisted") {
        toast.success(`Added to waitlist (position #${res.data.data.position})`);
      } else {
        toast.success("Class booked!");
      }
    },
    onError: () => toast.error("Booking failed"),
  });
}

export default function ClassesPage() {
  const { data: classes, isLoading } = useUpcomingClasses();
  const bookClass = useBookClass();
  const [bookingId, setBookingId] = useState<string | null>(null);

  const grouped = (classes ?? []).reduce<Record<string, ClassInstance[]>>((acc, cls) => {
    const day = cls.startsAt.substring(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day]!.push(cls);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Classes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Browse and book upcoming classes</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No upcoming classes scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([day, dayClasses]) => (
          <div key={day}>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              {format(new Date(day), "EEEE, d MMMM")}
            </p>
            <div className="space-y-2">
              {dayClasses.map((cls) => {
                const isFull = cls._count.bookings >= cls.capacity;
                const isBooking = bookingId === cls.id && bookClass.isPending;
                return (
                  <div key={cls.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{cls.template.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(cls.startsAt), "HH:mm")} ({cls.template.durationMin}min)
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cls._count.bookings}/{cls.capacity}
                          {isFull && cls._count.waitlist > 0 && ` +${cls._count.waitlist} waiting`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isBooking}
                      onClick={() => {
                        setBookingId(cls.id);
                        bookClass.mutate(cls.id, { onSettled: () => setBookingId(null) });
                      }}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        isFull
                          ? "bg-orange-100 text-orange-700"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      } disabled:opacity-60`}
                    >
                      {isBooking ? "…" : isFull ? "Waitlist" : "Book"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
