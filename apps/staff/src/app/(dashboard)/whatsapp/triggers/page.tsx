"use client";

import { useState } from "react";
import { Zap, CheckCircle, Clock } from "lucide-react";
import { Button, Card, CardContent } from "@grwfit/ui";
import { useTriggerRules, useUpsertTriggerRule, useWhatsappTemplates } from "@/hooks/use-whatsapp";
import type { TriggerRule } from "@/hooks/use-whatsapp";

// ── Event display metadata ────────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; desc: string; category: string }> = {
  member_created:   { label: "New Member",         desc: "Sends when a new member is added",              category: "Members"  },
  payment_success:  { label: "Payment Received",   desc: "Sends receipt when payment is recorded",        category: "Payments" },
  checkin:          { label: "Check-in",            desc: "Sends on each gym check-in (use sparingly)",   category: "Check-ins"},
  renewal_7d:       { label: "7 Days to Expiry",   desc: "Renewal reminder 7 days before expiry",         category: "Renewals" },
  renewal_3d:       { label: "3 Days to Expiry",   desc: "Renewal reminder with optional offer",          category: "Renewals" },
  renewal_1d:       { label: "1 Day to Expiry",    desc: "Urgent renewal reminder",                       category: "Renewals" },
  renewal_expired:  { label: "Membership Expired", desc: "Sends on the day of expiry",                    category: "Renewals" },
  renewal_7d_after: { label: "7 Days After Expiry","desc": "Win-back attempt after 7 days",               category: "Renewals" },
  renewal_30d_after:{ label: "30 Days After Expiry","desc": "Final win-back, then member goes dormant",   category: "Renewals" },
  birthday:         { label: "Birthday Wish",      desc: "Sends at 9am IST on member's birthday",         category: "Members"  },
  no_checkin_14d:   { label: "14-Day No-Show",     desc: "Re-engagement message for inactive members",    category: "Members"  },
};

const ALL_EVENTS = Object.keys(EVENT_META);

const CATEGORIES = ["Members", "Payments", "Check-ins", "Renewals"] as const;

// ── Toggle row ────────────────────────────────────────────────────────────────

function TriggerRow({
  event,
  rule,
  templates,
}: {
  event: string;
  rule?: TriggerRule;
  templates: Array<{ id: string; name: string; status: string }>;
}) {
  const upsert = useUpsertTriggerRule();
  const meta = EVENT_META[event]!;
  const isActive = rule?.isActive ?? false;
  const [selectedTemplate, setSelectedTemplate] = useState(rule?.template?.id ?? "");
  const [dirty, setDirty] = useState(false);

  const toggle = () => {
    upsert.mutate({ event, isActive: !isActive, templateId: selectedTemplate || undefined });
  };

  const saveTemplate = () => {
    upsert.mutate({ event, isActive, templateId: selectedTemplate || undefined });
    setDirty(false);
  };

  const approvedTemplates = templates.filter((t) => t.status === "approved");

  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{meta.label}</span>
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Off
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
        <div className="mt-2 flex items-center gap-2">
          <select
            className="text-xs border rounded px-2 py-1 bg-background max-w-[200px]"
            value={selectedTemplate}
            onChange={(e) => { setSelectedTemplate(e.target.value); setDirty(true); }}
          >
            <option value="">No template (disabled)</option>
            {approvedTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {dirty && (
            <Button size="sm" variant="outline" onClick={saveTemplate} disabled={upsert.isPending}>
              Save
            </Button>
          )}
          {!approvedTemplates.length && (
            <span className="text-xs text-muted-foreground">No approved templates yet</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={upsert.isPending || !selectedTemplate}
        title={!selectedTemplate ? "Select a template first" : undefined}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            isActive ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TriggersPage() {
  const { data: rules, isLoading } = useTriggerRules();
  const { data: templates } = useWhatsappTemplates();
  const [activeCategory, setActiveCategory] = useState<string>("Members");

  const ruleMap = new Map(rules?.map((r) => [r.event, r]) ?? []);

  const filtered = ALL_EVENTS.filter((e) => EVENT_META[e]?.category === activeCategory);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auto-Triggers</h1>
        <p className="text-muted-foreground mt-1">
          Configure which events automatically send WhatsApp messages to members.
          Changes take effect immediately — no redeploy needed.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div>
              {filtered.map((event) => (
                <TriggerRow
                  key={event}
                  event={event}
                  rule={ruleMap.get(event)}
                  templates={templates ?? []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <Zap className="h-3 w-3 inline mr-1" />
        Triggers respect member opt-outs and the <strong>Do Not Message</strong> flag automatically.
      </div>
    </div>
  );
}
