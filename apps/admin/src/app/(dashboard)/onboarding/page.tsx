"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useOnboardingPipeline } from "@/hooks/use-platform";
import { format } from "date-fns";

const STEP_LABELS = ["Members added", "First check-in", "First payment"];

function StepCheck({ done }: { done: boolean }) {
  return done
    ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: gyms, isLoading } = useOnboardingPipeline();

  const sorted = [...(gyms ?? [])].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Onboarding Pipeline</h1>
        <p className="text-muted-foreground mt-1">Trial gyms and their setup progress</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">No gyms in trial — all converted!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((gym) => {
            const urgent = (gym.daysLeft ?? 999) <= 3;
            const warning = (gym.daysLeft ?? 999) <= 7;
            return (
              <Card
                key={gym.id}
                className={`cursor-pointer hover:border-primary/50 transition-all ${urgent ? "border-red-300" : warning ? "border-orange-300" : ""}`}
                onClick={() => router.push(`/gyms/${gym.id}`)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{gym.name}</p>
                        {urgent && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started {format(new Date(gym.createdAt), "dd MMM yyyy")}
                      </p>
                      <div className="flex gap-3 mt-2">
                        {[gym.checklist.hasMembers, gym.checklist.hasCheckins, gym.checklist.hasPayments].map((done, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <StepCheck done={done} />
                            {STEP_LABELS[i]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${urgent ? "text-red-600" : warning ? "text-orange-600" : "text-muted-foreground"}`}>
                        {gym.daysLeft != null ? `${gym.daysLeft}d left` : "No expiry"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {gym.completedSteps}/{gym.totalSteps} steps
                      </div>
                      <div className="mt-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden ml-auto">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(gym.completedSteps / gym.totalSteps) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
