"use client";

import { useState } from "react";
import { Search, Shield } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useAuditLog } from "@/hooks/use-platform";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login:  "bg-purple-100 text-purple-700",
  logout: "bg-gray-100 text-gray-600",
  impersonate: "bg-orange-100 text-orange-700",
};

export default function CompliancePage() {
  const [gymFilter, setGymFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLog({
    gymId: gymFilter || undefined,
    action: actionFilter || undefined,
    page,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Audit Log & Compliance</h1>
        <p className="text-muted-foreground mt-1">Search all platform activity · DPDP Act 2023</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={gymFilter}
            onChange={(e) => { setGymFilter(e.target.value); setPage(1); }}
            placeholder="Gym ID..."
            className="border rounded-md pl-9 pr-3 py-2 text-sm bg-background w-48"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All actions</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="login">login</option>
          <option value="impersonate">impersonate</option>
        </select>
        <span className="self-center text-sm text-muted-foreground">
          {data?.meta.total.toLocaleString() ?? "…"} entries
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">When</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Gym</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Actor type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </td></tr>
                ))
              ) : (data?.data ?? []).map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.createdAt), "dd MMM, HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium font-mono ${ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.entity}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {entry.gym?.name ?? entry.gymId?.substring(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell">
                    <span className="capitalize">{entry.actorType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.meta.total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">Page {page} of {Math.ceil(data.meta.total / 50)}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">←</button>
                <button disabled={page >= Math.ceil(data.meta.total / 50)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DPDP notice */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Audit logs are retained for 7 years per Indian law. Data deletion requests and member data exports are managed via the gym&apos;s member portal. DPDP Act 2023 compliance tools available upon request.</p>
      </div>
    </div>
  );
}
