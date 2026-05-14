"use client";

import { useState } from "react";
import {
  Send, Plus, BarChart2, Users, CheckCircle,
  Clock, XCircle, Loader2,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge,
} from "@grwfit/ui";
import {
  useBroadcastCampaigns, useCreateBroadcast, useSendBroadcast,
  useCancelBroadcast, useAudienceCount, useWhatsappTemplates,
} from "@/hooks/use-whatsapp";
import type { BroadcastCampaign } from "@/hooks/use-whatsapp";
import { format } from "date-fns";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BroadcastCampaign["status"], { label: string; className: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700",   icon: Clock },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700",   icon: Clock },
  running:   { label: "Running",   className: "bg-yellow-100 text-yellow-700", icon: Loader2 },
  completed: { label: "Completed", className: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500",   icon: XCircle },
  failed:    { label: "Failed",    className: "bg-red-100 text-red-700",     icon: XCircle },
};

function StatusBadge({ status }: { status: BroadcastCampaign["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

// ── Delivery stats bar ────────────────────────────────────────────────────────

function DeliveryBar({ campaign }: { campaign: BroadcastCampaign }) {
  if (!campaign.sentCount) return null;
  const deliveryPct = Math.round((campaign.deliveredCount / campaign.sentCount) * 100);
  const readPct = Math.round((campaign.readCount / campaign.sentCount) * 100);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Sent {campaign.sentCount} / {campaign.totalCount}</span>
        <span>Delivered {deliveryPct}% · Read {readPct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(campaign.sentCount / campaign.totalCount) * 100}%` }} />
      </div>
    </div>
  );
}

// ── Create campaign form ───────────────────────────────────────────────────────

function CreateCampaignForm({ onClose }: { onClose: () => void }) {
  const { data: templates } = useWhatsappTemplates();
  const approvedTemplates = templates?.filter((t) => t.status === "approved") ?? [];
  const createBroadcast = useCreateBroadcast();
  const audienceCount = useAudienceCount();

  const [form, setForm] = useState({
    name: "",
    templateId: "",
    status: "active" as string,
    scheduledFor: "",
  });
  const [audienceSize, setAudienceSize] = useState<number | null>(null);

  const previewAudience = () => {
    audienceCount.mutate(
      { status: form.status || undefined },
      { onSuccess: (res) => setAudienceSize(res.data.data.count) },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBroadcast.mutate(
      {
        name: form.name,
        templateId: form.templateId,
        audienceFilter: form.status ? { status: form.status } : {},
        scheduledFor: form.scheduledFor || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campaign Name</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. June Renewal Push"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Template</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={form.templateId}
            onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
            required
          >
            <option value="">Select approved template...</option>
            {approvedTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Audience — Member Status</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={form.status}
            onChange={(e) => { setForm((p) => ({ ...p, status: e.target.value })); setAudienceSize(null); }}
          >
            <option value="">All members</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="trial">Trial</option>
            <option value="frozen">Frozen</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Schedule (optional)</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={form.scheduledFor}
            onChange={(e) => setForm((p) => ({ ...p, scheduledFor: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={previewAudience} disabled={audienceCount.isPending}>
          <Users className="h-4 w-4 mr-1" /> Preview Audience
        </Button>
        {audienceSize !== null && (
          <span className="text-sm text-muted-foreground">{audienceSize} members will receive this message</span>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={createBroadcast.isPending}>
          {createBroadcast.isPending ? "Creating..." : "Create Campaign"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  const { data: campaigns, isLoading } = useBroadcastCampaigns();
  const sendBroadcast = useSendBroadcast();
  const cancelBroadcast = useCancelBroadcast();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcast Campaigns</h1>
          <p className="text-muted-foreground mt-1">Send bulk WhatsApp messages to member segments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Campaign</CardTitle></CardHeader>
          <CardContent>
            <CreateCampaignForm onClose={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-28 pt-6" /></Card>)}
        </div>
      ) : !campaigns?.length ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <Send className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No campaigns yet. Create one to start broadcasting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.name}</span>
                      <StatusBadge status={c.status} />
                      <Badge variant="outline" className="text-xs">{c.template.name}</Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{c.totalCount} recipients</span>
                      {c.scheduledFor && <span>Scheduled {format(new Date(c.scheduledFor), "dd MMM, HH:mm")}</span>}
                      {c.completedAt && <span>Completed {format(new Date(c.completedAt), "dd MMM")}</span>}
                    </div>
                    <DeliveryBar campaign={c} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {["draft", "scheduled"].includes(c.status) && (
                      <Button
                        size="sm"
                        onClick={() => sendBroadcast.mutate(c.id)}
                        disabled={sendBroadcast.isPending}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Send Now
                      </Button>
                    )}
                    {["draft", "scheduled", "running"].includes(c.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:text-destructive"
                        onClick={() => cancelBroadcast.mutate(c.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {c.status === "completed" && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart2 className="h-3.5 w-3.5" />
                          {Math.round((c.readCount / (c.sentCount || 1)) * 100)}% read
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
