"use client";

import { useRouter } from "next/navigation";
import { Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useTrainersList, usePayoutReport } from "@/hooks/use-trainers";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

export default function TrainersPage() {
  const router = useRouter();
  const { data: trainers, isLoading } = useTrainersList();
  const { data: payout } = usePayoutReport();

  const month = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainers</h1>
          <p className="text-muted-foreground mt-1">Trainer profiles, members, and commission</p>
        </div>
        <button
          onClick={() => router.push("/trainers/commission")}
          className="text-sm text-primary hover:underline"
        >
          Commission Payout →
        </button>
      </div>

      {/* Monthly payout summary */}
      {payout && payout.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Payout — {month}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-wrap">
              {payout.map((row) => (
                <div key={row.trainer.id} className="text-center">
                  <p className="text-xl font-bold">{paiseToRupees(row.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">{row.trainer.name} ({row.count} commissions)</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trainers list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-20 pt-6" /></Card>)}
        </div>
      ) : (
        <div className="space-y-3">
          {(trainers ?? []).map((trainer) => (
            <Card
              key={trainer.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
              onClick={() => router.push(`/trainers/${trainer.id}/plans`)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {trainer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{trainer.name}</p>
                    <p className="text-sm text-muted-foreground">{trainer.phone}</p>
                    {trainer.branch && <p className="text-xs text-muted-foreground">{trainer.branch.name}</p>}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="text-center hidden sm:block">
                      <p className="font-medium text-foreground">{trainer.memberCount}</p>
                      <p className="text-xs">Members</p>
                    </div>
                    {trainer.commissionPct && (
                      <div className="text-center hidden sm:block">
                        <p className="font-medium text-foreground">{trainer.commissionPct}%</p>
                        <p className="text-xs">Commission</p>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {trainers?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No trainers yet. Add staff with the Trainer role.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
