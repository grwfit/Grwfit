"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useGyms } from "@/hooks/use-platform";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-600",
  churned: "bg-gray-100 text-gray-500",
};

const TIER_COLORS: Record<string, string> = {
  pro: "bg-indigo-100 text-indigo-700",
  standard: "bg-blue-100 text-blue-700",
  basic: "bg-gray-100 text-gray-600",
  trial: "bg-yellow-100 text-yellow-700",
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}</span>
    </div>
  );
}

export default function GymsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGyms({ search: debouncedSearch || undefined, status: status || undefined, page });

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Gyms</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, phone..."
            className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </select>
        <span className="self-center text-sm text-muted-foreground">
          {data?.meta.total ?? "…"} gyms
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gym</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Members</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Health</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 bg-muted animate-pulse rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : (data?.data ?? []).map((gym) => (
                <tr
                  key={gym.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/gyms/${gym.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{gym.name}</p>
                    <p className="text-xs text-muted-foreground">{gym.slug}.grwfit.com</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[gym.status] ?? ""}`}>
                      {gym.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[gym.planTier] ?? ""}`}>
                      {gym.planTier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{gym.memberCount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <HealthBar score={gym.healthScore} />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                    {format(new Date(gym.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.meta.total > data.meta.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Page {page} of {Math.ceil(data.meta.total / data.meta.limit)}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  disabled={page >= Math.ceil(data.meta.total / data.meta.limit)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
