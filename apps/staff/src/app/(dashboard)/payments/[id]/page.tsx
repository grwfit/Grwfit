"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { PaymentModeBadge } from "@/components/payments/payment-mode-badge";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { usePayment, useRefund } from "@/hooks/use-payments";
import { usePermission } from "@/hooks/use-permission";
import { PageLoader } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const canEdit = usePermission("payments", "edit");
  const { data: payment, isLoading } = usePayment(id);
  const refundMutation = useRefund(id);

  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  if (isLoading) return <PageLoader />;
  if (!payment) return <div className="text-center py-16 text-muted-foreground">Payment not found</div>;

  const basePaise = Math.round(payment.totalPaise * 100 / 118);
  const gstPaise  = payment.gstAmountPaise;

  const handleRefund = async () => {
    const amt = Math.round(parseFloat(refundAmount) * 100);
    if (!amt || !refundReason) return;
    await refundMutation.mutateAsync({ amountPaise: amt, reason: refundReason });
    setShowRefund(false);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{payment.invoiceNumber ?? "Payment"}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(payment.paidAt), "dd MMM yyyy, h:mm a")}</p>
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-3xl font-bold">₹{(payment.totalPaise / 100).toLocaleString("en-IN")}</p>
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={payment.status} />
                <PaymentModeBadge mode={payment.mode} />
              </div>
              {payment.txnRef && <p className="text-sm text-muted-foreground">Ref: {payment.txnRef}</p>}
            </div>
            <div className="flex gap-2">
              {payment.invoicePdfUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={payment.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1.5" /> Invoice PDF
                  </a>
                </Button>
              )}
              {canEdit && payment.status === "captured" && (
                <Button variant="outline" size="sm" onClick={() => setShowRefund(!showRefund)}>
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Refund
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Member</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name"  value={payment.member.name} />
            <Row label="Phone" value={payment.member.phone} />
            {payment.plan && <Row label="Plan" value={payment.plan.name} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">GST Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Base Amount"  value={`₹${(basePaise / 100).toFixed(2)}`} />
            <Row label="CGST 9%"      value={`₹${(gstPaise / 200).toFixed(2)}`} />
            <Row label="SGST 9%"      value={`₹${(gstPaise / 200).toFixed(2)}`} />
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span>₹{(payment.totalPaise / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refunds */}
      {(payment.refunds?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Refunds</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payment.refunds?.map((r) => (
              <div key={r.id} className="flex justify-between border-b pb-2 last:border-0">
                <div>
                  <p>{r.reason}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "dd MMM yyyy")}</p>
                </div>
                <span className="font-medium text-destructive">-₹{(r.amountPaise / 100).toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Refund form */}
      {showRefund && (
        <Card className="border-orange-200">
          <CardHeader><CardTitle className="text-sm">Process Refund</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Refund Amount (₹)</label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">₹</span>
                <input className="flex-1 rounded-r-md border bg-background px-3 py-2 text-sm"
                  type="number" step="0.01" min="1"
                  max={payment.totalPaise / 100}
                  placeholder={(payment.totalPaise / 100).toFixed(2)}
                  value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason *</label>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Member requested cancellation..."
                value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void handleRefund()} loading={refundMutation.isPending}
                disabled={!refundAmount || !refundReason} className="flex-1">
                Confirm Refund
              </Button>
              <Button variant="outline" onClick={() => setShowRefund(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
