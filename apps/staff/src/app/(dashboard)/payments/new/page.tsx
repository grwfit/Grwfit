"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useCreatePayment, usePlans } from "@/hooks/use-payments";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

interface MemberSearchResult { id: string; name: string; phone: string; status: string }

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { gymId } = useAuth();
  const { data: plans } = usePlans();
  const createPayment = useCreatePayment();

  const [memberSearch, setMemberSearch]   = useState("");
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState<"upi" | "cash" | "card" | "bank_transfer" | "razorpay">("upi");
  const [txnRef, setTxnRef] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  // Pre-fill from query param (from member page "Collect Payment")
  useEffect(() => {
    const mid = searchParams.get("memberId");
    const mname = searchParams.get("memberName");
    const mphone = searchParams.get("memberPhone");
    if (mid && mname && mphone) {
      setSelectedMember({ id: mid, name: mname, phone: mphone, status: "active" });
    }
  }, [searchParams]);

  const selectedPlan = plans?.find((p) => p.id === planId);
  const totalPaise = selectedPlan
    ? selectedPlan.pricePaise
    : customAmount ? Math.round(parseFloat(customAmount) * 100) : 0;

  const handleMemberSearch = async (q: string) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    try {
      const res = await apiClient.get<{ items: MemberSearchResult[] }>(`/gyms/${gymId}/members`, {
        params: { search: q, limit: 5 },
      });
      setMemberResults(res.data.items ?? []);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) { toast.error("Select a member"); return; }
    if (totalPaise <= 0) { toast.error("Enter an amount"); return; }

    await createPayment.mutateAsync({
      memberId: selectedMember.id,
      planId: planId || undefined,
      totalPaise,
      mode,
      txnRef: txnRef || undefined,
    });
    router.push("/payments");
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Record Payment</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">

            {/* Member selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Member *</label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMember.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => { setSelectedMember(null); setMemberSearch(""); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search by name or phone..."
                    value={memberSearch}
                    onChange={(e) => void handleMemberSearch(e.target.value)}
                    autoFocus
                  />
                  {memberResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-card shadow-lg">
                      {memberResults.map((m) => (
                        <button key={m.id} type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted text-left"
                          onClick={() => { setSelectedMember(m); setMemberResults([]); setMemberSearch(""); }}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Plan selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Membership Plan</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Custom amount (no plan)</option>
                {plans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{(p.pricePaise / 100).toLocaleString("en-IN")} / {p.durationDays}d
                  </option>
                ))}
              </select>
            </div>

            {/* Custom amount (when no plan selected) */}
            {!planId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount (₹, inclusive of GST) *</label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">₹</span>
                  <Input placeholder="1500.00" type="number" min="1" step="0.01"
                    className="rounded-l-none" value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)} />
                </div>
              </div>
            )}

            {/* GST breakdown preview */}
            {totalPaise > 0 && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base (excl. GST)</span>
                  <span>₹{(Math.round(totalPaise * 100 / 118) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST 9%</span>
                  <span>₹{((totalPaise - Math.round(totalPaise * 100 / 118)) / 200).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST 9%</span>
                  <span>₹{((totalPaise - Math.round(totalPaise * 100 / 118)) / 200).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>₹{(totalPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* Payment mode */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Mode *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["upi", "cash", "card", "bank_transfer", "razorpay"] as const).map((m) => (
                  <button key={m} type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-md border p-2 text-sm font-medium transition-colors ${
                      mode === m ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}>
                    {m === "bank_transfer" ? "Bank" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction reference */}
            {mode !== "cash" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {mode === "upi" ? "UPI Transaction ID" : mode === "card" ? "Last 4 digits" : "Reference"}
                </label>
                <Input placeholder="Optional reference" value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" loading={createPayment.isPending}
                disabled={!selectedMember || totalPaise <= 0}>
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              GST invoice will be generated and sent via WhatsApp automatically.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
