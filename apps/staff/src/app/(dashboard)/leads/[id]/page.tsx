"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, MessageSquare, Mail, User, UserCheck,
  StickyNote, TrendingDown, Send,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@grwfit/ui";
import { useLead, useAddActivity, useMarkLost, useConvertLead, useLeadStages, useUpdateLead } from "@/hooks/use-leads";
import type { LeadActivityType } from "@/hooks/use-leads";
import { usePermission } from "@/hooks/use-permission";
import { format, formatDistanceToNow } from "date-fns";

// ── Activity icon ─────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<LeadActivityType, React.ElementType> = {
  note: StickyNote, call: Phone, whatsapp: MessageSquare,
  email: Mail, visit: User, stage_change: TrendingDown, converted: UserCheck,
};

const ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  note: "Note", call: "Call", whatsapp: "WhatsApp", email: "Email",
  visit: "Visit", stage_change: "Stage changed", converted: "Converted",
};

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in", website: "Website", whatsapp: "WhatsApp",
  phone_call: "Phone call", instagram: "Instagram", referral: "Referral", other: "Other",
};

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: lead, isLoading } = useLead(params.id);
  const { data: stages } = useLeadStages();
  const addActivity = useAddActivity();
  const markLost = useMarkLost();
  const convertLead = useConvertLead();
  const updateLead = useUpdateLead();
  const canEdit = usePermission("leads", "edit");
  const canCreate = usePermission("leads", "create");

  const [note, setNote] = useState("");
  const [activityType, setActivityType] = useState<string>("note");
  const [showConvert, setShowConvert] = useState(false);
  const [lostReason] = useState("");

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    addActivity.mutate(
      { leadId: params.id, type: activityType, notes: note.trim() },
      { onSuccess: () => setNote("") },
    );
  };

  const handleConvert = () => {
    convertLead.mutate(
      { leadId: params.id },
      { onSuccess: (res) => router.push(`/members/${res.data.data.member.id}`) },
    );
  };

  const handleMarkLost = () => {
    markLost.mutate(
      { leadId: params.id, reason: lostReason || undefined },
      { onSuccess: () => router.push("/leads") },
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const isOpen = lead.status === "open";

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {SOURCE_LABELS[lead.source] ?? lead.source} ·
            Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lead.status === "open" && (
            <Badge variant="secondary">Open</Badge>
          )}
          {lead.status === "converted" && (
            <Badge variant="outline" className="text-green-600 border-green-600">Converted</Badge>
          )}
          {lead.status === "lost" && (
            <Badge variant="destructive">Lost</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${lead.phone}`} className="text-sm hover:underline">{lead.phone}</a>
                <a href={`https://wa.me/${lead.phone.replace("+", "")}`} target="_blank" rel="noreferrer"
                  className="ml-auto text-green-600 hover:text-green-700">
                  <MessageSquare className="h-4 w-4" />
                </a>
              </div>
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${lead.email}`} className="text-sm hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.stage && (
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: lead.stage.color }} />
                  </span>
                  <span className="text-sm">{lead.stage.name}</span>
                  {isOpen && canEdit && stages && (
                    <select
                      className="ml-auto text-xs border rounded px-2 py-1 bg-background"
                      value={lead.stageId ?? ""}
                      onChange={(e) => updateLead.mutate({ id: lead.id, stageId: e.target.value })}
                    >
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              {lead.followUpAt && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-4">📅</span>
                  <span className="text-sm">Follow up {format(new Date(lead.followUpAt), "dd MMM yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log activity */}
          {isOpen && (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={handleLogActivity} className="space-y-3">
                  <div className="flex gap-2">
                    {(["note", "call", "whatsapp", "visit"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActivityType(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activityType === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {ACTIVITY_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[72px] resize-none"
                      placeholder={`Log a ${activityType}...`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button type="submit" size="icon" className="self-end" disabled={!note.trim() || addActivity.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Activity timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Timeline</h3>
            {lead.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              lead.activities.map((act) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? StickyNote;
                return (
                  <div key={act.id} className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{ACTIVITY_LABELS[act.type]}</span>
                        {act.notes && <span className="text-muted-foreground"> — {act.notes}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(act.createdAt), "dd MMM yyyy, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {isOpen && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  onClick={() => setShowConvert(true)}
                  disabled={!canCreate}
                >
                  <UserCheck className="h-4 w-4 mr-2" /> Convert to Member
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 mr-2" /> Call Now
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`https://wa.me/${lead.phone.replace("+", "")}`} target="_blank" rel="noreferrer">
                    <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                  </a>
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Mark this lead as lost?")) handleMarkLost();
                    }}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" /> Mark as Lost
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Convert confirm */}
            {showConvert && (
              <Card className="border-primary/50">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-medium">Convert <strong>{lead.name}</strong> to a member?</p>
                  <p className="text-xs text-muted-foreground">
                    A new member profile will be created with their phone number.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleConvert} disabled={convertLead.isPending}>
                      {convertLead.isPending ? "Converting..." : "Confirm"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
