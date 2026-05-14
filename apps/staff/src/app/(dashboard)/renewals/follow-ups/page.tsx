"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, MessageSquare, Clock } from "lucide-react";
import { Button, Badge, Skeleton } from "@grwfit/ui";
import { useFollowUps, useMarkContacted } from "@/hooks/use-renewals";
import { formatDistanceToNow } from "date-fns";

const OUTCOME_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  contacted:      { label: "Contacted",      variant: "secondary" },
  interested:     { label: "Interested",     variant: "warning"   },
  not_interested: { label: "Not Interested", variant: "destructive"},
  converted:      { label: "Converted",      variant: "success"   },
  no_answer:      { label: "No Answer",      variant: "outline"   },
};

export default function FollowUpsPage() {
  const router = useRouter();
  const [page] = useState(1);
  const { data: followUps, isLoading } = useFollowUps(page);
  const markContacted = useMarkContacted();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Follow-up Pipeline</h1>
          <p className="text-sm text-muted-foreground">Members who were contacted but haven&apos;t renewed</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (followUps?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No pending follow-ups</p>
          <p className="text-sm text-muted-foreground mt-1">All contacted members have been resolved</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps?.map((f) => {
            const outcomeConfig = OUTCOME_CONFIG[f.outcome] ?? OUTCOME_CONFIG["contacted"]!;
            const isUrgent = f.daysInFollowUp >= 7;
            return (
              <div key={f.id}
                className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
                  isUrgent ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : "bg-card"
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      className="font-medium hover:underline text-left"
                      onClick={() => router.push(`/members/${f.member.id}`)}
                    >
                      {f.member.name}
                    </button>
                    <Badge variant={outcomeConfig.variant} className="text-xs">{outcomeConfig.label}</Badge>
                    {isUrgent && <Badge variant="warning" className="text-xs">Overdue {f.daysInFollowUp}d</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{f.member.phone}</p>
                  {f.notes && <p className="text-sm mt-1 text-muted-foreground">{f.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Contacted {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                    {f.followUpAt && ` · Follow up: ${new Date(f.followUpAt).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={`tel:${f.member.phone}`}
                    className="rounded-md p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600">
                    <Phone className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => markContacted.mutate({ memberId: f.memberId, outcome: "contacted" })}
                    className="rounded-md p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                    title="Mark as contacted again"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => markContacted.mutate({ memberId: f.memberId, outcome: "converted" })}
                    className="rounded-md p-2 hover:bg-muted text-muted-foreground text-xs font-medium px-3"
                  >
                    Renewed ✓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aging note */}
      {(followUps?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {followUps?.filter((f) => f.daysInFollowUp >= 7).length ?? 0} members overdue for follow-up (7+ days)
        </p>
      )}
    </div>
  );
}
