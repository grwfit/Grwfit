import { Badge } from "@grwfit/ui";

type PaymentStatus = "pending" | "captured" | "failed" | "refunded" | "partially_refunded";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: "success" | "destructive" | "secondary" | "warning" | "outline" }> = {
  captured:           { label: "Paid",             variant: "success"     },
  pending:            { label: "Pending",           variant: "warning"     },
  failed:             { label: "Failed",            variant: "destructive" },
  refunded:           { label: "Refunded",          variant: "secondary"   },
  partially_refunded: { label: "Partial Refund",    variant: "outline"     },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
