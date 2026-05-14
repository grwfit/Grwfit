"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useCreateMember } from "@/hooks/use-members";
import { useTrainers, useBranches } from "@/hooks/use-staff";

type Mode = "quick" | "full";

export default function NewMemberPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("quick");
  const { data: trainers } = useTrainers();
  const { data: branches } = useBranches();
  const createMember = useCreateMember();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", dob: "", gender: "",
    branchId: "", assignedTrainerId: "",
    emergencyContactName: "", emergencyContactPhone: "",
    healthNotes: "", medicalConditions: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMember.mutateAsync({
      name: form.name,
      phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone}`,
      email: form.email || undefined,
      dob: form.dob || undefined,
      gender: (form.gender as "male" | "female" | "other" | "prefer_not_to_say") || undefined,
      branchId: form.branchId || undefined,
      assignedTrainerId: form.assignedTrainerId || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      healthNotes: form.healthNotes || undefined,
      medicalConditions: form.medicalConditions || undefined,
    });
    router.push("/members");
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Add Member</h1>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        {(["quick", "full"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
          >
            {m === "quick" ? "Quick Add" : "Full Onboarding"}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "quick" ? "Basic Info (< 30 seconds)" : "Full Member Profile"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Always required */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <Input placeholder="Amit Kumar" value={form.name} onChange={set("name")} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone *</label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">+91</span>
                  <Input
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="rounded-l-none"
                    type="tel"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Quick mode: optional plan + branch */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(branches?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Branch</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.branchId} onChange={set("branchId")}>
                    <option value="">All branches</option>
                    {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {(trainers?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Assign Trainer</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.assignedTrainerId} onChange={set("assignedTrainerId")}>
                    <option value="">No trainer</option>
                    {trainers?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Full mode extras */}
            {mode === "full" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="amit@example.com" value={form.email} onChange={set("email")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" value={form.dob} onChange={set("dob")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Gender</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.gender} onChange={set("gender")}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input placeholder="Contact name" value={form.emergencyContactName} onChange={set("emergencyContactName")} />
                    <div className="flex">
                      <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">+91</span>
                      <Input
                        placeholder="9876543210"
                        value={form.emergencyContactPhone}
                        onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Health Notes</label>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                    placeholder="Any medical conditions, injuries, or health notes..."
                    value={form.healthNotes}
                    onChange={set("healthNotes")}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={createMember.isPending} className="flex-1">
                {mode === "quick" ? "Add Member" : "Create Member Profile"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              A welcome WhatsApp message will be sent automatically.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
