import { useAuth } from "@/providers/auth-provider";
import { PERMISSIONS } from "@/lib/permissions";
import type { Module, Permission, StaffRole } from "@grwfit/shared-types";

export function usePermission(module: Module, action: Permission): boolean {
  const { role } = useAuth();
  if (!role) return false;
  const perms = PERMISSIONS[role as StaffRole]?.[module] ?? [];
  return perms.includes(action);
}
