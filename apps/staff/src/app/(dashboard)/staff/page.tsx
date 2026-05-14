"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Plus, Search, MoreVertical, Pencil, UserX } from "lucide-react";
import { Button, Input, Badge } from "@grwfit/ui";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { RoleBadge } from "@/components/staff/role-badge";
import { usePermission } from "@/hooks/use-permission";
import { useStaffList, useDeactivateStaff } from "@/hooks/use-staff";
import { formatDistanceToNow } from "date-fns";

interface StaffUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "owner" | "manager" | "trainer" | "reception";
  isActive: boolean;
  lastLoginAt: string | null;
  commissionPct: string | null;
  branch: { id: string; name: string } | null;
}

export default function StaffPage() {
  const router = useRouter();
  const canCreate = usePermission("staff_mgmt", "create");
  const canEdit = usePermission("staff_mgmt", "edit");
  const canDelete = usePermission("staff_mgmt", "delete");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading, error } = useStaffList({
    page,
    search: search || undefined,
    role: roleFilter || undefined,
  });

  const deactivate = useDeactivateStaff();

  const handleDeactivate = (staff: StaffUser) => {
    if (!confirm(`Deactivate ${staff.name}? This will immediately log them out.`)) return;
    deactivate.mutate(staff.id);
    setOpenMenuId(null);
  };

  const columns: ColumnDef<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => row.branch?.name ?? <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "commission",
      header: "Commission",
      render: (row) =>
        row.commissionPct
          ? <span className="text-sm">{row.commissionPct}%</span>
          : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (row) =>
        row.lastLoginAt ? (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.lastLoginAt), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Never</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (row) =>
        (canEdit || canDelete) ? (
          <div className="relative">
            <button
              className="rounded p-1 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === row.id ? null : row.id);
              }}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {openMenuId === row.id && (
              <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border bg-card shadow-lg py-1">
                {canEdit && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/staff/${row.id}/edit`);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {canDelete && row.isActive && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeactivate(row);
                    }}
                  >
                    <UserX className="h-3.5 w-3.5" /> Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta?.total ?? 0} team members
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push("/staff/new")}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All roles</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="trainer">Trainer</option>
          <option value="reception">Reception</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={(data?.items ?? []) as StaffUser[]}
        isLoading={isLoading}
        error={error ? "Failed to load staff" : null}
        meta={data?.meta}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={(row) => canEdit && router.push(`/staff/${row.id}/edit`)}
        emptyIcon={UserCog}
        emptyTitle="No staff members yet"
        emptyDescription="Add your first team member to get started."
      />
    </div>
  );
}
