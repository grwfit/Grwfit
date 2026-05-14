"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, AlertTriangle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useGymDetail, useImpersonate } from "@/hooks/use-platform";
import { format } from "date-fns";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

export default function GymDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading } = useGymDetail(params.id);
  const impersonate = useImpersonate();
  const [reason, setReason] = useState("");
  const [impersonationToken, setImpersonationToken] = useState<string | null>(null);
  const [showImpersonateForm, setShowImpersonateForm] = useState(false);

  const handleImpersonate = () => {
    impersonate.mutate(
      { gymId: params.id, reason: reason.trim() || "Platform support" },
      {
        onSuccess: (res) => {
          setImpersonationToken(res.data.data.token);
          setShowImpersonateForm(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  const gym = data?.gym;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{gym?.name}</h1>
          <p className="text-sm text-muted-foreground">{gym?.slug}.grwfit.com · {gym?.status}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowImpersonateForm(true)} variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1.5" /> Impersonate
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Members", value: data?.activeMembers },
          { label: "Revenue This Month", value: data ? paiseToRupees(data.revenueThisMonthPaise) : "—" },
          { label: "Plan", value: gym?.planTier },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Impersonation form */}
      {showImpersonateForm && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              Impersonate {gym?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">This action is logged. The session expires in 15 minutes.</p>
            <div>
              <label className="block text-xs font-medium mb-1">Reason for impersonation *</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="e.g. Customer reported payment issue, investigating"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImpersonate}
                disabled={impersonate.isPending || !reason.trim()}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                {impersonate.isPending ? "Generating…" : "Generate Session Token"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImpersonateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impersonation token */}
      {impersonationToken && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Impersonation Token (expires in 15 min — read-only by default)
            </p>
            <code className="text-xs break-all bg-white dark:bg-gray-900 border rounded p-2 block">
              {impersonationToken}
            </code>
            <p className="text-xs text-orange-600 mt-2">
              Copy this token and use it in the staff app Authorization header or paste into the gym&apos;s login page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent audit log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.recentAudit ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {data?.recentAudit.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    entry.action === "create" ? "bg-green-100 text-green-700"
                    : entry.action === "delete" ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                  }`}>{entry.action}</span>
                  <span className="text-muted-foreground">{entry.entity}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(entry.createdAt), "dd MMM, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
