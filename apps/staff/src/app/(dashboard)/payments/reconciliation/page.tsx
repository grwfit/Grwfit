"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useCashReconciliations, useSubmitReconciliation, useApproveReconciliation } from "@/hooks/use-payments";
import { usePermission } from "@/hooks/use-permission";
import { format } from "date-fns";

export default function ReconciliationPage() {
  const router = useRouter();
  const canApprove = usePermission("payments", "edit");
  const [actualAmount, setActualAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: records, isLoading } = useCashReconciliations();
  const submit = useSubmitReconciliation();
  const approve = useApproveReconciliation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit.mutateAsync({
      actualPaise: actualAmount ? Math.round(parseFloat(actualAmount) * 100) : 0,
      notes: notes || undefined,
    });
    setActualAmount(""); setNotes("");
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Cash Reconciliation</h1>
      </div>

      {/* Today's close */}
      <Card>
        <CardHeader><CardTitle className="text-base">Today&apos;s Close of Day</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cash in Drawer (₹)</label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">₹</span>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={actualAmount} onChange={(e) => setActualAmount(e.target.value)}
                  className="rounded-l-none" />
              </div>
              <p className="text-xs text-muted-foreground">
                Count the physical cash in your drawer and enter the total
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Input placeholder="Any discrepancies or comments..." value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" loading={submit.isPending}>Submit Reconciliation</Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Reconciliation History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
          ) : (records?.length ?? 0) === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No reconciliations yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b"><tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expected</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actual</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Variance</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                {canApprove && <th className="px-4 py-3" />}
              </tr></thead>
              <tbody className="divide-y">
                {records?.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{format(new Date(r.date), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ₹{(r.expectedPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ₹{(r.actualPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${
                      r.variancePaise === 0 ? "text-green-600" : r.variancePaise > 0 ? "text-blue-600" : "text-destructive"
                    }`}>
                      {r.variancePaise >= 0 ? "+" : ""}₹{(r.variancePaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "approved" ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle className="h-3.5 w-3.5" /> Approved
                        </span>
                      ) : r.status === "submitted" ? (
                        <span className="flex items-center gap-1 text-orange-500 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" /> Pending
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs capitalize">{r.status}</span>
                      )}
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3">
                        {r.status === "submitted" && (
                          <Button size="sm" variant="outline"
                            onClick={() => approve.mutate(r.id)} loading={approve.isPending}>
                            Approve
                          </Button>
                        )}
                      </td>
                    )}
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
