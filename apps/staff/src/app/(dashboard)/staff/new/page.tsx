"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useCreateStaff, useBranches } from "@/hooks/use-staff";
import { usePermission } from "@/hooks/use-permission";

export default function NewStaffPage() {
  const router = useRouter();
  const canCreate = usePermission("staff_mgmt", "create");
  const { data: branches } = useBranches();
  const createStaff = useCreateStaff();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "trainer" as "owner" | "manager" | "trainer" | "reception",
    branchId: "",
    email: "",
    commissionPct: "",
  });

  if (!canCreate) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">You don&apos;t have permission to add staff.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createStaff.mutateAsync({
      name: form.name,
      phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone}`,
      role: form.role,
      branchId: form.branchId || undefined,
      email: form.email || undefined,
      commissionPct: form.commissionPct ? parseFloat(form.commissionPct) : undefined,
    });
    router.push("/staff");
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Add Staff Member</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name *</label>
              <Input placeholder="Arjun Singh" value={form.name} onChange={set("name")} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone Number *</label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">
                  +91
                </span>
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.role}
                onChange={set("role")}
                required
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="trainer">Trainer</option>
                <option value="reception">Reception</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {form.role === "trainer" && "Trainer — access to assigned members, workout & diet plans, commission"}
                {form.role === "manager" && "Manager — branch-scoped access, no staff management or billing"}
                {form.role === "reception" && "Reception — check-in, leads, and payment collection"}
                {form.role === "owner" && "Owner — full access to all features and branches"}
              </p>
            </div>

            {(branches?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Branch</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.branchId}
                  onChange={set("branchId")}
                >
                  <option value="">All branches</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="arjun@example.com" type="email" value={form.email} onChange={set("email")} />
            </div>

            {form.role === "trainer" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Commission %</label>
                <Input
                  placeholder="10"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commissionPct}
                  onChange={set("commissionPct")}
                />
                <p className="text-xs text-muted-foreground">Percentage of first month fee</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={createStaff.isPending} className="flex-1">
                Add Staff Member
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              A WhatsApp login invite will be sent to their phone number.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
