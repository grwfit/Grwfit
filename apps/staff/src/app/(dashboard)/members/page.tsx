"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Download, Upload } from "lucide-react";
import { Button, Input, Badge } from "@grwfit/ui";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { MemberStatusBadge } from "@/components/members/member-status-badge";
import { usePermission } from "@/hooks/use-permission";
import { useMemberList, useBulkAction } from "@/hooks/use-members";
import type { Member } from "@/hooks/use-members";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { useAuth } from "@/providers/auth-provider";

export default function MembersPage() {
  const router = useRouter();
  const { gymId } = useAuth();
  const canCreate = usePermission("members", "create");
  const canEdit   = usePermission("members", "edit");

  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useMemberList({
    page,
    search: search || undefined,
    status: status || undefined,
  });

  const bulkAction = useBulkAction();

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === (data?.items?.length ?? 0)) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data?.items?.map((m) => m.id) ?? []));
    }
  };

  const handleExport = () => {
    void (async () => {
      const params = new URLSearchParams({ limit: "10000", ...(status && { status }) });
      const url = `/api/v1/gyms/${gymId}/members/export?${params.toString()}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "members.csv";
      a.click();
    })();
  };

  const columns: ColumnDef<Member>[] = [
    {
      key: "select",
      header: "",
      className: "w-10",
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-input"
        />
      ),
    },
    {
      key: "name",
      header: "Member",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <MemberStatusBadge status={row.status} />,
    },
    {
      key: "expiry",
      header: "Expires",
      sortable: true,
      render: (row) => {
        if (!row.expiresAt) return <span className="text-muted-foreground text-xs">—</span>;
        const days = differenceInDays(new Date(row.expiresAt), new Date());
        const isUrgent = days >= 0 && days <= 7;
        const isExpired = days < 0;
        return (
          <span className={`text-sm ${isExpired ? "text-destructive" : isUrgent ? "text-orange-500" : ""}`}>
            {isExpired
              ? `${Math.abs(days)}d ago`
              : days === 0 ? "Today"
              : `${days}d left`}
          </span>
        );
      },
    },
    {
      key: "joined",
      header: "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.joinedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => row.branch?.name
        ? <span className="text-sm">{row.branch.name}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "tags",
      header: "Tags",
      render: (row) =>
        Array.isArray(row.tags) && row.tags.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {(row.tags as string[]).map((t) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta?.total ?? 0} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          {canCreate && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push("/members/import")}>
                <Upload className="h-4 w-4 mr-1.5" /> Import
              </Button>
              <Button size="sm" onClick={() => router.push("/members/new")}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="frozen">Frozen</option>
        </select>

        {/* Bulk actions */}
        {selected.size > 0 && canEdit && (
          <div className="flex gap-2 items-center ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkAction.mutate({
                  memberIds: Array.from(selected),
                  action: "tag",
                  tag: prompt("Tag name:") ?? "vip",
                })
              }
            >
              Tag
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkAction.mutate({ memberIds: Array.from(selected), action: "send_whatsapp", message: "Hi" })
              }
            >
              WhatsApp
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Header select-all */}
      {(data?.items?.length ?? 0) > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox"
            checked={selected.size === (data?.items?.length ?? 0) && selected.size > 0}
            onChange={toggleAll}
            className="rounded border-input"
          />
          Select all on page
        </label>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={error ? "Failed to load members" : null}
        meta={data?.meta}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/members/${row.id}`)}
        emptyIcon={Users}
        emptyTitle="No members yet"
        emptyDescription={canCreate ? "Add your first member to get started." : "No members match your filters."}
      />
    </div>
  );
}
