"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, UserX } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from "@grwfit/ui";
import { RoleBadge } from "@/components/staff/role-badge";
import { useStaffMember, useUpdateStaff, useDeactivateStaff, useBranches } from "@/hooks/use-staff";
import { usePermission } from "@/hooks/use-permission";
import { PageLoader } from "@/components/ui/loading-spinner";
import { formatDistanceToNow } from "date-fns";

export default function EditStaffPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const canEdit = usePermission("staff_mgmt", "edit");
  const canDelete = usePermission("staff_mgmt", "delete");
  const { data: branches } = useBranches();

  const { data: staff, isLoading } = useStaffMember(id);
  const updateStaff = useUpdateStaff();
  const deactivate = useDeactivateStaff();

  const [form, setForm] = useState({
    name: "",
    role: "" as "owner" | "manager" | "trainer" | "reception",
    branchId: "",
    email: "",
    commissionPct: "",
  });

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        role: staff.role,
        branchId: staff.branchId ?? "",
        email: staff.email ?? "",
        commissionPct: staff.commissionPct?.toString() ?? "",
      });
    }
  }, [staff]);

  if (isLoading) return <PageLoader />;
  if (!staff) return <div className="text-center py-16 text-muted-foreground">Staff not found</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStaff.mutateAsync({
      staffId: id,
      name: form.name,
      role: form.role,
      branchId: form.branchId || undefined,
      email: form.email || undefined,
      commissionPct: form.commissionPct ? parseFloat(form.commissionPct) : undefined,
    });
    router.push("/staff");
  };

  const handleDeactivate = () => {
    if (!confirm(`Deactivate ${staff.name}? This will immediately end their session.`)) return;
    deactivate.mutate(staff.id, { onSuccess: () => router.push("/staff") });
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Staff</h1>
          <p className="text-sm text-muted-foreground">{staff.phone}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Staff Details</CardTitle>
          <div className="flex items-center gap-2">
            <RoleBadge role={staff.role} />
            <Badge variant={staff.isActive ? "success" : "secondary"}>
              {staff.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={form.name} onChange={set("name")} required disabled={!canEdit} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input value={staff.phone} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Phone cannot be changed</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:bg-muted"
                value={form.role}
                onChange={set("role")}
                disabled={!canEdit}
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="trainer">Trainer</option>
                <option value="reception">Reception</option>
              </select>
            </div>

            {(branches?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Branch</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:bg-muted"
                  value={form.branchId}
                  onChange={set("branchId")}
                  disabled={!canEdit}
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
              <Input type="email" value={form.email} onChange={set("email")} disabled={!canEdit} />
            </div>

            {(form.role === "trainer" || staff.role === "trainer") && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Commission %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commissionPct}
                  onChange={set("commissionPct")}
                  disabled={!canEdit}
                />
              </div>
            )}

            {staff.lastLoginAt && (
              <p className="text-xs text-muted-foreground">
                Last login: {formatDistanceToNow(new Date(staff.lastLoginAt), { addSuffix: true })}
              </p>
            )}

            {canEdit && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={updateStaff.isPending} className="flex-1">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {canDelete && staff.isActive && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Deactivate this staff member</p>
                <p className="text-xs text-muted-foreground">
                  Immediately ends their active sessions and blocks login
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                loading={deactivate.isPending}
              >
                <UserX className="h-4 w-4 mr-2" /> Deactivate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
