"use client";

import { useState } from "react";
import { Shield, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button, Card, CardContent } from "@grwfit/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { format } from "date-fns";

interface DeletionRequest {
  id: string;
  memberId: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  reason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  member: { name: string; phone: string };
}

interface AuditEntry {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  entity: string;
  ip: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending:  { icon: Clock,        color: "text-yellow-600 bg-yellow-50", label: "Pending" },
  approved: { icon: CheckCircle,  color: "text-green-600 bg-green-50",   label: "Approved" },
  rejected: { icon: XCircle,      color: "text-red-600 bg-red-50",       label: "Rejected" },
  deleted:  { icon: CheckCircle,  color: "text-gray-500 bg-gray-50",     label: "Deleted" },
} as const;

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login:  "bg-purple-100 text-purple-700",
};

export default function StaffCompliancePage() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"deletion" | "audit">("deletion");
  const [auditAction, setAuditAction] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const { data: deletions } = useQuery({
    queryKey: ["compliance", "deletions", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DeletionRequest[] }>(`/gyms/${gymId}/compliance/deletion-requests`);
      return res.data.data;
    },
    enabled: !!gymId,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["compliance", "audit", gymId, auditAction, auditEntity, auditPage],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { data: AuditEntry[]; meta: { total: number } } }>(
        `/gyms/${gymId}/compliance/audit-log`,
        { params: { action: auditAction || undefined, entity: auditEntity || undefined, page: auditPage } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });

  const approve = useMutation({
    mutationFn: (requestId: string) =>
      apiClient.post(`/gyms/${gymId}/compliance/deletion-requests/${requestId}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", "deletions"] });
      toast.success("Deletion request approved — member PII anonymised");
    },
    onError: () => toast.error("Approval failed"),
  });

  const reject = useMutation({
    mutationFn: (requestId: string) =>
      apiClient.post(`/gyms/${gymId}/compliance/deletion-requests/${requestId}/reject`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", "deletions"] });
      toast.success("Deletion request rejected");
    },
    onError: () => toast.error("Rejection failed"),
  });

  const TABS = [
    { key: "deletion", label: "Deletion Requests" },
    { key: "audit",    label: "Audit Log" },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-muted-foreground text-sm">DPDP Act 2023 · Audit log · Member data rights</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "deletion" && (
        <div className="space-y-3">
          {(!deletions || deletions.length === 0) ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground">No deletion requests</p>
              </CardContent>
            </Card>
          ) : (
            deletions.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              const Icon = cfg.icon;
              return (
                <Card key={req.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{req.member.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.color}`}>
                            <Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{req.member.phone}</p>
                        {req.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {req.reason}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested {format(new Date(req.requestedAt), "dd MMM yyyy")}
                        </p>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline"
                            className="text-destructive border-destructive/50"
                            onClick={() => {
                              if (confirm(`Approve deletion for ${req.member.name}? This anonymises their PII immediately.`)) {
                                approve.mutate(req.id);
                              }
                            }}
                            disabled={approve.isPending}
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => reject.mutate(req.id)}
                            disabled={reject.isPending}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          <div className="text-xs text-muted-foreground flex items-start gap-2 bg-muted/30 rounded-lg p-3">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Under DPDP Act 2023, approved deletion requests anonymise personal data immediately. Financial records are retained for 7 years as required by Indian law. Hard deletion occurs automatically 30 days after approval.</p>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={auditAction} onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
              className="border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">All actions</option>
              <option value="create">create</option>
              <option value="update">update</option>
              <option value="delete">delete</option>
              <option value="login">login</option>
            </select>
            <input value={auditEntity} onChange={(e) => { setAuditEntity(e.target.value); setAuditPage(1); }}
              placeholder="Entity (e.g. members)" className="border rounded-md px-3 py-2 text-sm bg-background w-40" />
            <span className="self-center text-sm text-muted-foreground">
              {auditData?.meta.total.toLocaleString() ?? "…"} entries
            </span>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={4} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td></tr>
                    ))
                  ) : (auditData?.data ?? []).map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.createdAt), "dd MMM HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-600"}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.entity}</td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell capitalize">{entry.actorType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditData && auditData.meta.total > 50 && (
                <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
                  <span className="text-muted-foreground">Page {auditPage}</span>
                  <div className="flex gap-2">
                    <button disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">←</button>
                    <button onClick={() => setAuditPage(p => p + 1)} className="px-3 py-1 border rounded">→</button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
