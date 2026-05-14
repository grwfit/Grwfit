export type StaffRole = "owner" | "manager" | "trainer" | "reception";

export interface StaffUser {
  id: string;
  gymId: string;
  branchId: string | null;
  phone: string;
  email: string | null;
  name: string;
  role: StaffRole;
  commissionPct: number | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffJwtPayload {
  sub: string;
  userId: string;
  gymId: string;
  role: StaffRole;
  branchId: string | null;
  type: "staff";
  iat?: number;
  exp?: number;
}

export type Permission =
  | "view"
  | "create"
  | "edit"
  | "delete";

export type Module =
  | "dashboard"
  | "members"
  | "checkins"
  | "payments"
  | "plans"
  | "workout_diet"
  | "leads"
  | "reports"
  | "staff_mgmt"
  | "website_cms"
  | "billing"
  | "commission";

export type PermissionMatrix = Record<Module, Permission[]>;
export type RolePermissions = Record<StaffRole, PermissionMatrix>;
