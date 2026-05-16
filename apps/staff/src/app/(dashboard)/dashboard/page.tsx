"use client";

import { useRouter } from "next/navigation";
import { Users, LogIn, CreditCard, TrendingUp, CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useOnboardingProgress } from "@/hooks/use-onboarding";
import { useTodayCheckins } from "@/hooks/use-checkins";
import { useMemberReport, useRevenueReport } from "@/hooks/use-reports";
import { useRenewalsDashboard } from "@/hooks/use-renewals";

const STEP_LABELS = [
  "Set up gym profile",
  "Configure membership plans",
  "Add your trainers",
  "Import members",
  "Complete first check-in",
];

function SetupChecklist({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const { data: progress } = useOnboardingProgress();

  if (!progress || progress.completedAt) return null;
  if (progress.gym?.planTier !== "trial") return null;

  const completed = new Set(progress.completedSteps);
  const total = 5;
  const done = completed.size;

  return (
    <Card className={`border-2 ${done === total ? "border-green-500" : "border-primary/30"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Setup Checklist</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {done}/{total} steps complete
              {progress.daysLeft !== null && ` · ${progress.daysLeft} trial days left`}
            </p>
          </div>
          {progress.daysLeft !== null && progress.daysLeft <= 3 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              Trial expiring!
            </span>
          )}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-1.5">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isDone = completed.has(step);
            return (
              <div key={step} className="flex items-center gap-2 text-sm">
                {isDone
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                }
                <span className={isDone ? "text-muted-foreground line-through" : ""}>{label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/onboarding")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Continue setup →
          </button>
          {done < total && (
            <button type="button" onClick={onDismiss} className="text-sm text-muted-foreground hover:underline ml-auto">
              Dismiss
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function StatCard({ label, icon: Icon, color, value, isLoading }: {
  label: string; icon: React.ElementType; color: string; value: string; isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: memberReport, isLoading: membersLoading } = useMemberReport("mtd");
  const { data: checkins, isLoading: checkinsLoading } = useTodayCheckins();
  const { data: revenue, isLoading: revenueLoading } = useRevenueReport("mtd");
  const { data: renewals, isLoading: renewalsLoading } = useRenewalsDashboard({ bucket: "week" });

  const activeMembers = memberReport?.statusBreakdown?.find((s) => s.status === "active")?.count ?? 0;
  const totalMembers = memberReport?.total ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <SetupChecklist onDismiss={() => {}} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Members"
          icon={Users}
          color="text-blue-600"
          value={`${activeMembers.toLocaleString("en-IN")}${totalMembers > 0 ? ` / ${totalMembers.toLocaleString("en-IN")}` : ""}`}
          isLoading={membersLoading}
        />
        <StatCard
          label="Check-ins Today"
          icon={LogIn}
          color="text-green-600"
          value={String(checkins?.total ?? 0)}
          isLoading={checkinsLoading}
        />
        <StatCard
          label="Revenue This Month"
          icon={CreditCard}
          color="text-purple-600"
          value={formatPaise(revenue?.totalPaise ?? 0)}
          isLoading={revenueLoading}
        />
        <StatCard
          label="Renewals Due (7d)"
          icon={TrendingUp}
          color="text-orange-600"
          value={String(renewals?.summary?.week?.count ?? 0)}
          isLoading={renewalsLoading}
        />
      </div>
    </div>
  );
}
