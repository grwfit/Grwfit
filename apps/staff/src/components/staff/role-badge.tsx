import { Badge } from "@grwfit/ui";
import type { StaffRole } from "@grwfit/shared-types";

const ROLE_CONFIG: Record<StaffRole, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }> = {
  owner: { label: "Owner", variant: "default" },
  manager: { label: "Manager", variant: "success" },
  trainer: { label: "Trainer", variant: "warning" },
  reception: { label: "Reception", variant: "secondary" },
};

export function RoleBadge({ role }: { role: StaffRole }) {
  const config = ROLE_CONFIG[role] ?? { label: role, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
