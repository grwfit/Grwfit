"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, MessageSquare, CheckSquare,
  Download, Send, Users, Clock,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { useRenewalsDashboard, useSendReminder, useBulkReminder, useMarkContacted } from "@/hooks/use-renewals";
import type { RenewalMember, Bucket } from "@/hooks/use-renewals";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/providers/auth-provider";
import { formatDistanceToNow } from "date-fns";

const BUCKET_LABELS: Record<Bucket, { label: string; color: string; bg: string }> = {
  today:       { label: "Due Today",   color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/20"    },
  week:        { label: "Due in 7d",   color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
  month:       { label: "Due in 30d",  color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  expired_7:   { label: "Expired <7d", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
  expired_30:  { label: "Expired 7-30d", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20"   },
  expired_90:  { label: "Expired 1-3m", color: "text-gray-600",  bg: "bg-gray-50 dark:bg-gray-950/20"   },
  expired_old: { label: "Expired >3m",  color: "text-gray-400",  bg: "bg-gray-50 dark:bg-gray-950/20"   },
};

export default function RenewalsPage() {
  const router = useRouter();
  const { gymId } = useAuth();
  const canEdit = usePermission("members", "edit");

  const [activeBucket, setActiveBucket] = useState<Bucket>("week");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactingId, setContactingId] = useState<string | null>(null);

  const { data, isLoading } = useRenewalsDashboard({ bucket: activeBucket, page });
  const sendReminder = useSendReminder();
  const bulkReminder = useBulkReminder();
  const markContacted = useMarkContacted();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkSend = () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    bulkReminder.mutate({ bucket: ids ? undefined : activeBucket, memberIds: ids });
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    const url = `/api/v1/gyms/${gymId}/renewals/export?bucket=${activeBucket}`;
    window.open(url, "_blank");
  };

  const columns: ColumnDef<RenewalMember>[] = [
    {
      key: "select",
      header: "",
      className: "w-10",
      render: (row) => (
        <input type="checkbox" checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-input" />
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => row.planName ?? <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "expiry",
      header: "Expires",
      sortable: true,
      render: (row) => {
        const days = row.daysToExpiry;
        const color = days === null ? "" : days < 0 ? "text-destructive" : days <= 3 ? "text-orange-500" : "";
        return (
          <div>
            {row.expiresAt && (
              <p className={`text-sm font-medium ${color}`}>
                {days !== null && days >= 0 ? `${days}d left` : days !== null ? `${Math.abs(days)}d ago` : "—"}
              </p>
            )}
            {row.expiresAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(row.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "revenue",
      header: "Potential ₹",
      render: (row) => row.pricePaise
        ? <span className="font-semibold tabular-nums">₹{(row.pricePaise / 100).toLocaleString("en-IN")}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "lastContacted",
      header: "Last Contacted",
      render: (row) => row.lastContactedAt
        ? <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(row.lastContactedAt), { addSuffix: true })}</span>
        : <span className="text-xs text-muted-foreground">Never</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (row) => canEdit ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {/* WhatsApp */}
          <button
            title="Send WhatsApp reminder"
            className="rounded p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
            onClick={() => sendReminder.mutate({ memberId: row.id })}
            disabled={sendReminder.isPending}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {/* Call */}
          <a
            href={`tel:${row.phone}`}
            title="Call member"
            className="rounded p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
          >
            <Phone className="h-4 w-4" />
          </a>

          {/* Mark contacted */}
          <button
            title="Log contact outcome"
            className="rounded p-1.5 hover:bg-muted text-muted-foreground"
            onClick={() => setContactingId(row.id)}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
        </div>
      ) : null,
    },
  ];

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Renewals</h1>
          <p className="text-sm text-muted-foreground">Track and follow up on upcoming and overdue renewals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/renewals/settings")}>
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/renewals/follow-ups")}>
            <Clock className="h-4 w-4 mr-1.5" /> Follow-ups
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          {canEdit && (
            <Button size="sm" onClick={handleBulkSend} loading={bulkReminder.isPending}>
              <Send className="h-4 w-4 mr-1.5" />
              {selectedIds.size > 0 ? `Send to ${selectedIds.size}` : `Send to All (${activeBucket})`}
            </Button>
          )}
        </div>
      </div>

      {/* Bucket summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => {
          const cfg   = BUCKET_LABELS[bucket];
          const stat  = summary?.[bucket];
          const isActive = activeBucket === bucket;
          return (
            <button
              key={bucket}
              onClick={() => { setActiveBucket(bucket); setPage(1); setSelectedIds(new Set()); }}
              className={`rounded-lg border p-3 text-left transition-all ${
                isActive ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
              } ${cfg.bg}`}
            >
              <p className={`text-2xl font-bold ${cfg.color}`}>{stat?.count ?? 0}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{cfg.label}</p>
              {(stat?.revenuePaise ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{((stat?.revenuePaise ?? 0) / 100).toLocaleString("en-IN")}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" onClick={handleBulkSend} loading={bulkReminder.isPending}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send WhatsApp
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {/* Members table */}
      <DataTable
        columns={columns}
        data={data?.members ?? []}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/members/${r.id}`)}
        emptyIcon={Users}
        emptyTitle={`No members in "${BUCKET_LABELS[activeBucket].label}"`}
        emptyDescription="Great work — no renewals due in this window."
      />

      {/* Mark contacted modal */}
      {contactingId && (
        <ContactModal
          memberId={contactingId}
          memberName={data?.members.find((m) => m.id === contactingId)?.name ?? ""}
          onSubmit={(outcome, notes, followUpAt) => {
            markContacted.mutate({ memberId: contactingId, outcome, notes, followUpAt });
            setContactingId(null);
          }}
          onClose={() => setContactingId(null)}
          isLoading={markContacted.isPending}
        />
      )}
    </div>
  );
}

function ContactModal({
  memberName, onSubmit, onClose, isLoading,
}: {
  memberId?: string;
  memberName: string;
  onSubmit: (outcome: "contacted" | "interested" | "not_interested" | "converted" | "no_answer", notes?: string, followUpAt?: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [outcome, setOutcome] = useState<"contacted" | "interested" | "not_interested" | "converted" | "no_answer">("contacted");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Log contact — {memberName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {(["contacted", "interested", "not_interested", "converted", "no_answer"] as const).map((o) => (
                <button key={o} type="button"
                  onClick={() => setOutcome(o)}
                  className={`rounded-md border p-2 text-xs font-medium transition-colors capitalize ${
                    outcome === o ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}>
                  {o.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
              placeholder="Call outcome, next steps..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {outcome !== "converted" && outcome !== "not_interested" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Schedule Follow-up</label>
              <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
            </div>
          )}
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => onSubmit(outcome, notes || undefined, followUpAt || undefined)} loading={isLoading}>
              Save
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
