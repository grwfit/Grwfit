"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, Snowflake, Play } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@grwfit/ui";
import { MemberStatusBadge } from "@/components/members/member-status-badge";
import { MemberQr } from "@/components/members/member-qr";
import { useMember, useFreezeMember, useUnfreezeMember } from "@/hooks/use-members";
import { usePermission } from "@/hooks/use-permission";
import { PageLoader } from "@/components/ui/loading-spinner";
import { OverviewTab } from "./tabs/overview-tab";
import { NotesTab } from "./tabs/notes-tab";
import { AttendanceTab } from "./tabs/attendance-tab";
import { PaymentsTab } from "./tabs/payments-tab";
import { formatDistanceToNow, differenceInDays } from "date-fns";

type Tab = "overview" | "attendance" | "payments" | "plans" | "progress" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Overview" },
  { key: "attendance", label: "Attendance" },
  { key: "payments",   label: "Payments" },
  { key: "plans",      label: "Plans" },
  { key: "progress",   label: "Progress" },
  { key: "notes",      label: "Notes" },
];

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  const canEdit   = usePermission("members", "edit");

  const { data: member, isLoading, error } = useMember(id);
  const freeze   = useFreezeMember();
  const unfreeze = useUnfreezeMember();

  if (isLoading) return <PageLoader />;
  if (error || !member) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Member not found</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
    </div>
  );

  const daysLeft = member.expiresAt
    ? differenceInDays(new Date(member.expiresAt), new Date())
    : null;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-sm text-muted-foreground">Member ID: {member.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {member.status === "frozen" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unfreeze.mutate(member.id)}
                loading={unfreeze.isPending}
              >
                <Play className="h-4 w-4 mr-1.5" /> Unfreeze
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFreezeModal(true)}
              >
                <Snowflake className="h-4 w-4 mr-1.5" /> Freeze
              </Button>
            )}
            <Button size="sm" onClick={() => router.push(`/members/${id}/edit`)}>
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <MemberStatusBadge status={member.status} />
                  {Array.isArray(member.tags) && (member.tags as string[]).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{member.email}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Joined </span>
                    {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                  </div>
                  {daysLeft !== null && (
                    <div>
                      <span className={`font-medium ${daysLeft < 0 ? "text-destructive" : daysLeft <= 7 ? "text-orange-500" : ""}`}>
                        {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Member QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberQr qrCode={member.qrCode} memberName={member.name} memberId={member.id} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-0 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "overview"   && <OverviewTab member={member} />}
          {activeTab === "notes"      && <NotesTab memberId={member.id} />}
          {activeTab === "attendance" && <AttendanceTab memberId={member.id} />}
          {activeTab === "payments"   && <PaymentsTab memberId={member.id} memberName={member.name} memberPhone={member.phone} />}
          {activeTab === "plans"      && <ComingSoonTab name="Plans"      note="Built in Module 9 (Trainers & Plans)" />}
          {activeTab === "progress"   && <ComingSoonTab name="Progress"   note="Built in Module 9 (Progress Tracking)" />}
        </div>
      </div>

      {/* Freeze modal */}
      {showFreezeModal && (
        <FreezeModal
          memberName={member.name}
          onConfirm={(reason, until) => {
            freeze.mutate(
              { memberId: member.id, reason, untilDate: until },
              { onSuccess: () => setShowFreezeModal(false) },
            );
          }}
          onCancel={() => setShowFreezeModal(false)}
          isLoading={freeze.isPending}
        />
      )}
    </div>
  );
}

function ComingSoonTab({ name, note }: { name: string; note: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-muted-foreground mt-1">{note}</p>
    </div>
  );
}

function FreezeModal({
  memberName,
  onConfirm,
  onCancel,
  isLoading,
}: {
  memberName: string;
  onConfirm: (reason: string, until: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Freeze {memberName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Membership expiry will be paused until the member is unfrozen.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. Travelling abroad"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Auto-unfreeze on (optional)</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => onConfirm(reason, until)}
              loading={isLoading}
            >
              <Snowflake className="h-4 w-4 mr-2" /> Freeze
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
