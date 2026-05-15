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

export const PERMISSIONS: RolePermissions = {
  owner: {
    dashboard: ["view", "create", "edit", "delete"],
    members: ["view", "create", "edit", "delete"],
    checkins: ["view", "create", "edit", "delete"],
    payments: ["view", "create", "edit", "delete"],
    plans: ["view", "create", "edit", "delete"],
    workout_diet: ["view", "create", "edit", "delete"],
    leads: ["view", "create", "edit", "delete"],
    reports: ["view", "create", "edit", "delete"],
    staff_mgmt: ["view", "create", "edit", "delete"],
    website_cms: ["view", "create", "edit", "delete"],
    billing: ["view", "create", "edit", "delete"],
    commission: ["view", "create", "edit", "delete"],
  },
  manager: {
    dashboard: ["view"],
    members: ["view", "create", "edit"],
    checkins: ["view", "create"],
    payments: ["view", "create"],
    plans: ["view", "create", "edit"],
    workout_diet: ["view", "create", "edit"],
    leads: ["view", "create", "edit"],
    reports: ["view"],
    staff_mgmt: [],
    website_cms: ["view", "edit"],
    billing: [],
    commission: ["view"],
  },
  trainer: {
    dashboard: ["view"],
    members: ["view"],
    checkins: ["view"],
    payments: [],
    plans: ["view", "create", "edit"],
    workout_diet: ["view", "create", "edit"],
    leads: [],
    reports: [],
    staff_mgmt: [],
    website_cms: [],
    billing: [],
    commission: ["view"],
  },
  reception: {
    dashboard: ["view"],
    members: ["view", "create"],
    checkins: ["view", "create"],
    payments: ["view", "create"],
    plans: ["view"],
    workout_diet: [],
    leads: ["view", "create", "edit"],
    reports: [],
    staff_mgmt: [],
    website_cms: [],
    billing: [],
    commission: [],
  },
};
