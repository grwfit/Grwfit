"use client";

import { Dumbbell, CreditCard, Flame, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@grwfit/ui";
import { useAuth } from "@/providers/auth-provider";
import { useWorkoutPlan, useCheckins } from "@/hooks/use-member";
import { format } from "date-fns";

function StatusBanner({ daysLeft, status }: { daysLeft: number | null; status: string }) {
  if (status === "frozen") {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">Your membership is frozen.</p>
      </div>
    );
  }
  if (status === "expired") {
    return (
      <Link href="/membership">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-80">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Membership expired</p>
            <p className="text-xs text-red-500">Tap to renew now</p>
          </div>
        </div>
      </Link>
    );
  }
  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <Link href="/membership">
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-80">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Membership expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-orange-500">Tap to renew</p>
          </div>
        </div>
      </Link>
    );
  }
  return null;
}

function TodayWorkoutCard({ plan }: { plan: ReturnType<typeof useWorkoutPlan>["data"] }) {
  const dayKey = `day${new Date().getDay() || 7}`; // 1=Mon…7=Sun
  const exercises = plan?.week[dayKey] ?? [];

  return (
    <Link href="/plan">
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Workout</p>
              <p className="font-semibold mt-0.5">{plan?.name ?? "No plan set"}</p>
            </div>
            <Dumbbell className="h-6 w-6 text-primary shrink-0" />
          </div>
          {exercises.length > 0 ? (
            <div className="mt-3 space-y-1">
              {exercises.slice(0, 3).map((ex, i) => (
                <p key={i} className="text-sm text-muted-foreground">• {ex}</p>
              ))}
              {exercises.length > 3 && (
                <p className="text-xs text-primary">+{exercises.length - 3} more →</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              {plan ? "Rest day 🌟" : "Ask your trainer to set up your plan"}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const { session } = useAuth();
  const { data: plan } = useWorkoutPlan();
  const { data: checkins } = useCheckins();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.name.split(" ")[0] ?? "";

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{greeting}, {firstName}! 💪</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
      </div>

      {/* Status banners */}
      {session && (
        <StatusBanner daysLeft={session.daysLeft} status={session.status} />
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{session?.streak ?? 0}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{checkins?.monthlyCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <CreditCard className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{session?.daysLeft ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Days left</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's workout */}
      <TodayWorkoutCard plan={plan} />

      {/* Membership card */}
      <Link href="/membership">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Membership</p>
                <p className="font-semibold mt-0.5">{session?.planName ?? "No plan"}</p>
                {session?.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Expires {format(new Date(session.expiresAt), "dd MMM yyyy")}
                  </p>
                )}
              </div>
              <div className={`h-3 w-3 rounded-full ${
                session?.status === "active" ? "bg-green-500" :
                session?.status === "trial" ? "bg-yellow-500" : "bg-red-500"
              }`} />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Recent check-ins */}
      {(checkins?.recent.length ?? 0) > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Recent Check-ins</p>
          <div className="space-y-1.5">
            {checkins?.recent.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                <span>{format(new Date(c.checkedInAt), "EEE, dd MMM")}</span>
                <span className="text-xs text-muted-foreground capitalize">{c.method}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
