"use client";

import { useRouter } from "next/navigation";
import { Users, LogIn, CreditCard, TrendingUp, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useOnboardingProgress } from "@/hooks/use-onboarding";

const STEP_LABELS = [
  "Set up gym profile",
  "Configure membership plans",
  "Add your trainers",
  "Import members",
  "Complete first check-in",
];

const STATS = [
  { label: "Active Members", icon: Users, color: "text-blue-600" },
  { label: "Check-ins Today", icon: LogIn, color: "text-green-600" },
  { label: "Revenue This Month", icon: CreditCard, color: "text-purple-600" },
  { label: "Renewals Due (7d)", icon: TrendingUp, color: "text-orange-600" },
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

export default function DashboardPage() {

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Setup checklist for new gyms */}
      <SetupChecklist onDismiss={() => {}} />

      {/* Placeholder stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
