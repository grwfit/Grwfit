import { Badge } from "@grwfit/ui";

type MemberStatus = "active" | "expired" | "frozen" | "trial";

const STATUS_CONFIG: Record<MemberStatus, { label: string; variant: "success" | "destructive" | "secondary" | "warning" | "outline" }> = {
  active:  { label: "Active",  variant: "success" },
  expired: { label: "Expired", variant: "destructive" },
  frozen:  { label: "Frozen",  variant: "secondary" },
  trial:   { label: "Trial",   variant: "warning" },
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
