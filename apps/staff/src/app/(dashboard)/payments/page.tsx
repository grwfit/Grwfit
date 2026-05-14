"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Download, Search, BarChart2 } from "lucide-react";
import { Button, Input } from "@grwfit/ui";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { PaymentModeBadge } from "@/components/payments/payment-mode-badge";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { usePaymentList } from "@/hooks/use-payments";
import type { Payment } from "@/hooks/use-payments";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/providers/auth-provider";
import { format } from "date-fns";

export default function PaymentsPage() {
  const router = useRouter();
  const { gymId } = useAuth();
  const canCreate = usePermission("payments", "create");
  const canView   = usePermission("reports", "view");

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePaymentList({
    page, search: search || undefined,
    mode: mode || undefined, status: status || undefined,
  });

  const totalRevenue = data?.items?.reduce((s, p) => s + (p.status === "captured" ? p.totalPaise : 0), 0) ?? 0;

  const handleExportGst = () => {
    const today = new Date().toISOString().split("T")[0]!;
    const firstOfMonth = new Date(); firstOfMonth.setDate(1);
    const from = firstOfMonth.toISOString().split("T")[0]!;
    const url = `/api/v1/gyms/${gymId}/payments/gst-report/export?from=${from}&to=${today}`;
    window.open(url, "_blank");
  };

  const columns: ColumnDef<Payment>[] = [
    {
      key: "invoice",
      header: "Invoice",
      render: (row) => (
        <div>
          <p className="font-medium font-mono text-sm">{row.invoiceNumber ?? "Generating…"}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(row.paidAt), "dd MMM yyyy")}</p>
        </div>
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium">{row.member.name}</p>
          <p className="text-xs text-muted-foreground">{row.member.phone}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => row.plan?.name ?? <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-semibold tabular-nums">
          ₹{(row.totalPaise / 100).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      render: (row) => <PaymentModeBadge mode={row.mode} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <PaymentStatusBadge status={row.status} />,
    },
    {
      key: "pdf",
      header: "Invoice",
      render: (row) =>
        row.invoicePdfUrl ? (
          <a href={row.invoicePdfUrl} target="_blank" rel="noopener noreferrer"
            className="text-primary text-sm hover:underline" onClick={(e) => e.stopPropagation()}>
            PDF
          </a>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta?.total ?? 0} transactions ·{" "}
            <span className="font-medium">₹{(totalRevenue / 100).toLocaleString("en-IN")}</span> shown
          </p>
        </div>
        <div className="flex gap-2">
          {canView && (
            <Button variant="outline" size="sm" onClick={handleExportGst}>
              <Download className="h-4 w-4 mr-1.5" /> GST Report (CSV)
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => router.push("/payments/new")}>
              <Plus className="h-4 w-4 mr-1.5" /> Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/payments/reconciliation")}>
            <BarChart2 className="h-4 w-4 mr-1.5" /> Cash Reconciliation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Invoice, member name..." className="pl-9"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rounded-md border bg-background px-3 py-2 text-sm"
          value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}>
          <option value="">All modes</option>
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="razorpay">Razorpay</option>
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm"
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="captured">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={error ? "Failed to load payments" : null}
        meta={data?.meta}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/payments/${r.id}`)}
        emptyIcon={CreditCard}
        emptyTitle="No payments yet"
        emptyDescription="Record your first payment to get started."
      />
    </div>
  );
}
