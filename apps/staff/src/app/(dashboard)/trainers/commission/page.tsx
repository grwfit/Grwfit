"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, DollarSign } from "lucide-react";
import { Button, Card, CardContent } from "@grwfit/ui";
import {
  useCommissions, usePayoutReport, useApproveCommissions, useMarkCommissionsPaid,
} from "@/hooks/use-trainers";
import { format } from "date-fns";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  paid:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelled:"bg-gray-100 text-gray-500",
};

export default function CommissionPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [month] = useState(new Date().toISOString().substring(0, 7));

  const { data: commissionsData, isLoading } = useCommissions({ status: statusFilter, month });
  const { data: payoutRows } = usePayoutReport(month);
  const approve = useApproveCommissions();
  const markPaid = useMarkCommissionsPaid();

  const commissions = commissionsData?.data ?? [];
  const toggle = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(commissions.map((c) => c.id)));
  const clearAll = () => setSelectedIds(new Set());

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Commission Payout</h1>
          <p className="text-muted-foreground text-sm">{new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Monthly summary */}
      {payoutRows && payoutRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {payoutRows.map((row) => (
            <Card key={row.trainer.id}>
              <CardContent className="pt-4 pb-4">
                <p className="font-medium">{row.trainer.name}</p>
                <p className="text-2xl font-bold mt-1">{paiseToRupees(row.totalPaise)}</p>
                <p className="text-xs text-muted-foreground">{row.count} commissions pending/approved</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {(["pending", "approved", "paid"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(s); clearAll(); }}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}

        {selectedIds.size > 0 && (
          <div className="ml-auto flex gap-2">
            {statusFilter === "pending" && (
              <Button size="sm" variant="outline" onClick={() => approve.mutate(Array.from(selectedIds))}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve ({selectedIds.size})
              </Button>
            )}
            {statusFilter === "approved" && (
              <Button size="sm" onClick={() => markPaid.mutate({ ids: Array.from(selectedIds) })}>
                <DollarSign className="h-3.5 w-3.5 mr-1" /> Mark Paid ({selectedIds.size})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
          </div>
        )}

        {commissions.length > 0 && selectedIds.size === 0 && (
          <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={selectAll}>
            Select all
          </button>
        )}
      </div>

      {/* Commission rows */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : commissions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No {statusFilter} commissions</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => (
            <div
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.has(c.id) ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
              }`}
            >
              <input type="checkbox" readOnly checked={selectedIds.has(c.id)} className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{paiseToRupees(c.amountPaise)}</p>
                <p className="text-xs text-muted-foreground">
                  {c.payment?.invoiceNumber ?? "—"} · {c.payment ? format(new Date(c.payment.paidAt), "dd MMM") : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
