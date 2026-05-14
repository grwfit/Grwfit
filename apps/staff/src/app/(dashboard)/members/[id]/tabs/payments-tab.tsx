"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, Skeleton, Button } from "@grwfit/ui";
import { CreditCard, Plus, Download } from "lucide-react";
import { usePaymentList } from "@/hooks/use-payments";
import { PaymentModeBadge } from "@/components/payments/payment-mode-badge";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { usePermission } from "@/hooks/use-permission";
import { format } from "date-fns";

export function PaymentsTab({ memberId, memberName, memberPhone }: { memberId: string; memberName: string; memberPhone: string }) {
  const router = useRouter();
  const canCreate = usePermission("payments", "create");
  const { data, isLoading } = usePaymentList({ memberId });

  const totalPaid = data?.items?.reduce((s, p) => s + (p.status === "captured" ? p.totalPaise : 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total paid: <span className="font-bold text-foreground">₹{(totalPaid / 100).toLocaleString("en-IN")}</span>
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => router.push(`/payments/new?memberId=${memberId}&memberName=${encodeURIComponent(memberName)}&memberPhone=${memberPhone}`)}>
            <Plus className="h-4 w-4 mr-1.5" /> Collect Payment
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.items?.length ?? 0) === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b"><tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody className="divide-y">
                {data?.items?.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/payments/${p.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">{p.invoiceNumber ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.paidAt), "dd MMM yyyy")}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">₹{(p.totalPaise / 100).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3"><PaymentModeBadge mode={p.mode} /></td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.invoicePdfUrl && (
                        <a href={p.invoicePdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </td>
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
