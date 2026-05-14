"use client";

import { CreditCard, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useAuth } from "@/providers/auth-provider";
import { usePayments } from "@/hooks/use-member";
import { format } from "date-fns";

const MODE_LABELS: Record<string, string> = {
  upi: "UPI", cash: "Cash", card: "Card",
  bank_transfer: "Bank Transfer", razorpay: "Razorpay",
};

const STATUS_ICONS = {
  active:  { icon: CheckCircle, color: "text-green-500", label: "Active" },
  trial:   { icon: Clock,       color: "text-yellow-500", label: "Trial" },
  expired: { icon: XCircle,     color: "text-red-500", label: "Expired" },
  frozen:  { icon: Clock,       color: "text-blue-500", label: "Frozen" },
};

export default function MembershipPage() {
  const { session } = useAuth();
  const { data: payments, isLoading } = usePayments();

  const statusCfg = STATUS_ICONS[session?.status as keyof typeof STATUS_ICONS] ?? STATUS_ICONS.expired;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">My Membership</h1>
      </div>

      {/* Membership card */}
      <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/70 text-xs uppercase tracking-wide">Current Plan</p>
              <p className="text-xl font-bold mt-0.5">{session?.planName ?? "No plan"}</p>
              <p className="text-primary-foreground/80 text-sm mt-1">{session?.branchName ?? ""}</p>
            </div>
            <div className={`flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-sm`}>
              <StatusIcon className={`h-3.5 w-3.5`} />
              {statusCfg.label}
            </div>
          </div>
          {session?.expiresAt && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="text-primary-foreground/70">Expires</span>
                <span className="font-medium">{format(new Date(session.expiresAt), "dd MMM yyyy")}</span>
              </div>
              {session.daysLeft !== null && session.daysLeft > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-primary-foreground/70 mb-1">
                    <span>Time remaining</span>
                    <span>{session.daysLeft} days</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white/70"
                      style={{ width: `${Math.min(100, (session.daysLeft / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew CTA */}
      {(session?.status === "expired" || (session?.daysLeft != null && session.daysLeft <= 7)) && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center">
          <p className="font-medium text-orange-700 dark:text-orange-300">
            {session.status === "expired" ? "Your membership has expired" : `Expires in ${session.daysLeft} days`}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Contact reception or pay at the desk to renew.
          </p>
        </div>
      )}

      {/* Payment history */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Payment History
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !payments?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No payments yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.plan?.name ?? "Membership"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.paidAt), "dd MMM yyyy")} · {MODE_LABELS[p.mode] ?? p.mode}
                  </p>
                  {p.invoiceNumber && (
                    <p className="text-xs text-muted-foreground font-mono">{p.invoiceNumber}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">₹{(p.totalPaise / 100).toLocaleString("en-IN")}</p>
                  {p.invoicePdfUrl && (
                    <a
                      href={p.invoicePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 text-xs hover:underline mt-0.5"
                    >
                      <Download className="h-3 w-3" /> Invoice
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
