"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card, CardContent, Input } from "@grwfit/ui";
import { useKanban, useMoveLead, useCreateLead, useFunnelReport } from "@/hooks/use-leads";
import type { Lead } from "@/hooks/use-leads";
import { usePermission } from "@/hooks/use-permission";
import { format, formatDistanceToNow } from "date-fns";

// ── Source badge ──────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",   website: "Website",   whatsapp: "WhatsApp",
  phone_call: "Call",   instagram: "Instagram", referral: "Referral", other: "Other",
};

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

// ── Lead card (draggable) ─────────────────────────────────────────────────────

function LeadCard({ lead, isDragging = false }: { lead: Lead; isDragging?: boolean }) {
  const router = useRouter();
  return (
    <div
      onClick={() => !isDragging && router.push(`/leads/${lead.id}`)}
      className={`bg-card border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all select-none ${isDragging ? "opacity-50 rotate-1" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight">{lead.name}</p>
        <SourceBadge source={lead.source} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{lead.phone}</p>
      {lead.followUpAt && (
        <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
          Follow up {format(new Date(lead.followUpAt), "dd MMM")}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1.5">
        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}



// ── Add lead form ─────────────────────────────────────────────────────────────

function AddLeadForm({ onClose }: { onClose: () => void }) {
  const createLead = useCreateLead();
  const [form, setForm] = useState({ name: "", phone: "", source: "walk_in" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate(
      { name: form.name, phone: form.phone, source: form.source },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs font-medium mb-1">Name</label>
        <Input value={form.name} onChange={set("name")} placeholder="Lead name" required className="w-40" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Phone</label>
        <Input value={form.phone} onChange={set("phone")} placeholder="9XXXXXXXXX" required className="w-36" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Source</label>
        <select className="border rounded-md px-2 py-2 text-sm bg-background" value={form.source} onChange={set("source")}>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={createLead.isPending}>Add</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { data: columns, isLoading } = useKanban();
  const { data: funnel } = useFunnelReport();
  const moveLead = useMoveLead();
  const canCreate = usePermission("leads", "create");
  const [showAdd, setShowAdd] = useState(false);

  // Native HTML5 drag-and-drop (no external dep at this layer — dnd-kit used for sortable if needed)
  const handleDrop = (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;
    moveLead.mutate({ leadId, stageId: toStageId });
  };

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads Pipeline</h1>
          {funnel && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {funnel.totalLeads} leads · {funnel.conversionRate}% conversion (last {funnel.period})
            </p>
          )}
        </div>
        {canCreate && (
          <Button onClick={() => setShowAdd((p) => !p)}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        )}
      </div>

      {showAdd && (
        <Card><CardContent className="pt-4 pb-4"><AddLeadForm onClose={() => setShowAdd(false)} /></CardContent></Card>
      )}

      {/* Funnel stats */}
      {funnel && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {funnel.bySource.sort((a, b) => b.count - a.count).slice(0, 4).map((s) => (
            <div key={s.source} className="bg-muted/50 rounded-lg px-3 py-2 text-center shrink-0">
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">{SOURCE_LABELS[s.source] ?? s.source}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="min-w-[240px] h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {(columns ?? []).map((col) => (
            <div
              key={col.id}
              className="flex flex-col gap-2 min-w-[240px] max-w-[280px] shrink-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.color }} />
                <span className="font-medium text-sm">{col.name}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                  {col.leads.length}
                </span>
              </div>
              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[80px] rounded-lg bg-muted/30 p-2 flex-1">
                {col.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)}
                    onDragEnd={() => null}
                  >
                    <LeadCard lead={lead} />
                  </div>
                ))}
                {col.leads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
