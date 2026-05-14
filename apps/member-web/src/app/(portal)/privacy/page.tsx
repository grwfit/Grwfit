"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Download, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Consent { type: string; granted: boolean; grantedAt: string; revokedAt: string | null }
interface ExportRequest { id: string; status: string; fileUrl: string | null; createdAt: string; completedAt: string | null }


function useConsents() {
  return useQuery({
    queryKey: ["member", "compliance", "consents"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Consent[] }>("/members/me/compliance/consents");
      return res.data.data;
    },
  });
}

function useExportStatus() {
  return useQuery({
    queryKey: ["member", "compliance", "export"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ExportRequest | null }>("/members/me/compliance/export/status");
      return res.data.data;
    },
  });
}

const CONSENT_LABELS: Record<string, { label: string; desc: string; required?: boolean }> = {
  operational: { label: "Operational",  desc: "Required for gym access, check-ins, and payments.", required: true },
  marketing:   { label: "Marketing",    desc: "WhatsApp reminders, renewal nudges, and promotions." },
  analytics:   { label: "Analytics",    desc: "Anonymous usage data to improve our services." },
};

export default function PrivacyPage() {
  const qc = useQueryClient();
  const { data: consents } = useConsents();
  const { data: exportReq } = useExportStatus();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const consentMap = new Map((consents ?? []).map((c) => [c.type, c.granted]));

  const toggleConsent = useMutation({
    mutationFn: async ({ type, grant }: { type: string; grant: boolean }) => {
      if (grant) {
        return apiClient.post("/members/me/compliance/consents/grant", { types: [type] });
      }
      return apiClient.post(`/members/me/compliance/consents/revoke/${type}`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "compliance", "consents"] }),
    onError: () => toast.error("Failed to update preference"),
  });

  const requestExport = useMutation({
    mutationFn: () => apiClient.post("/members/me/compliance/export", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", "compliance", "export"] });
      toast.success("Data export requested. Ready within 2 minutes.");
    },
    onError: () => toast.error("Export request failed"),
  });

  const requestDeletion = useMutation({
    mutationFn: () => apiClient.post("/members/me/compliance/deletion", { reason: deleteReason || undefined }),
    onSuccess: () => {
      toast.success("Deletion request submitted. The gym will review within 30 days.");
      setShowDeleteConfirm(false);
    },
    onError: () => toast.error("Request failed"),
  });

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Privacy & Data</h1>
          <p className="text-muted-foreground text-xs mt-0.5">DPDP Act 2023 — Your rights</p>
        </div>
      </div>

      {/* Consent toggles */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {Object.entries(CONSENT_LABELS).map(([type, meta]) => {
            const granted = consentMap.get(type) ?? false;
            return (
              <div key={type} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                </div>
                {meta.required ? (
                  <span className="text-xs text-muted-foreground shrink-0 self-center">Required</span>
                ) : (
                  <button
                    type="button"
                    disabled={toggleConsent.isPending}
                    onClick={() => toggleConsent.mutate({ type, grant: !granted })}
                    className={`relative h-6 w-11 rounded-full transition-colors shrink-0 self-center ${granted ? "bg-primary" : "bg-muted"} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${granted ? "translate-x-5" : ""}`} />
                  </button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Data export */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Your Data (Right to Access)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Download all your personal data including check-ins, payments, workout plans, and progress logs.
          </p>
          {exportReq?.status === "completed" && exportReq.fileUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-green-600">
                Export ready — generated {format(new Date(exportReq.completedAt!), "dd MMM yyyy, h:mm a")}
              </p>
              <a
                href={exportReq.fileUrl}
                download="my-gym-data.json"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" /> Download My Data
              </a>
            </div>
          ) : exportReq?.status === "processing" || exportReq?.status === "pending" ? (
            <p className="text-xs text-muted-foreground">Processing your export…</p>
          ) : (
            <button
              type="button"
              onClick={() => requestExport.mutate()}
              disabled={requestExport.isPending}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {requestExport.isPending ? "Requesting…" : "Request Data Export"}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Deletion request */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive">Delete My Account (Right to Erasure)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Request deletion of all your personal data. The gym will review within 30 days. Payments history is retained for legal compliance.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm text-destructive hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Request Account Deletion
            </button>
          ) : (
            <div className="space-y-3 border border-destructive/30 rounded-lg p-3">
              <p className="text-xs font-medium text-destructive">Are you sure? This cannot be undone.</p>
              <textarea
                rows={2}
                className="w-full border rounded-md px-2 py-1.5 text-xs bg-background resize-none"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason (optional)"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => requestDeletion.mutate()}
                  disabled={requestDeletion.isPending}
                  className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/50 rounded px-3 py-1.5 hover:bg-destructive/5"
                >
                  <Check className="h-3 w-3" /> Confirm
                </button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded px-3 py-1.5">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
