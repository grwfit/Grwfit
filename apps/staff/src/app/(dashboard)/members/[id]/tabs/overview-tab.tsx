"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { User, Dumbbell, MapPin, AlertCircle } from "lucide-react";
import type { MemberFull } from "@/hooks/use-members";
import { format } from "date-fns";

export function OverviewTab({ member }: { member: MemberFull }) {
  const address = member.address;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Gender" value={member.gender ?? "—"} />
          <Row label="Date of Birth" value={member.dob ? format(new Date(member.dob), "dd MMM yyyy") : "—"} />
          <Row label="Branch" value={member.branch?.name ?? "—"} />
          {address && (
            <Row
              label="Address"
              value={[address.street, address.city, address.state, address.pincode].filter(Boolean).join(", ") || "—"}
            />
          )}
        </CardContent>
      </Card>

      {/* Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> Health & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Array.isArray(member.goals) && member.goals.length > 0 && (
            <Row label="Goals" value={(member.goals as string[]).join(", ")} />
          )}
          {member.healthNotes && (
            <div>
              <p className="text-muted-foreground text-xs">Health Notes</p>
              <p className="mt-0.5">{member.healthNotes}</p>
            </div>
          )}
          {member.medicalConditions && (
            <div>
              <p className="text-muted-foreground text-xs">Medical Conditions</p>
              <p className="mt-0.5 text-orange-600">{member.medicalConditions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency contact */}
      {(member.emergencyContactName || member.emergencyContactPhone) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={member.emergencyContactName ?? "—"} />
            <Row label="Phone" value={member.emergencyContactPhone ?? "—"} />
          </CardContent>
        </Card>
      )}

      {/* Membership */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Status" value={member.status} />
          <Row label="Joined" value={format(new Date(member.joinedAt), "dd MMM yyyy")} />
          {member.expiresAt && (
            <Row label="Expires" value={format(new Date(member.expiresAt), "dd MMM yyyy")} />
          )}
          <Row label="QR Code" value={member.qrCode} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
