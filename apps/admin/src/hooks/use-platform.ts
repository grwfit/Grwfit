"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PlatformOverview {
  totalGyms: number;
  activeGyms: number;
  trialGyms: number;
  totalMembers: number;
  mrrPaise: number;
  arrPaise: number;
  mrrGrowth: number | null;
  recentGyms: Array<{ id: string; name: string; slug: string; status: string; planTier: string; createdAt: string }>;
}

export interface GymRow {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: string;
  phone: string;
  createdAt: string;
  trialEndsAt: string | null;
  memberCount: number;
  staffCount: number;
  weeklyCheckins: number;
  healthScore: number;
}

export interface GymDetail {
  gym: { id: string; name: string; slug: string; phone: string; planTier: string; status: string; createdAt: string };
  revenueThisMonthPaise: number;
  activeMembers: number;
  recentAudit: Array<{ id: string; actorType: string; action: string; entity: string; createdAt: string }>;
}

export interface AuditLogEntry {
  id: string;
  gymId: string | null;
  actorId: string;
  actorType: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  ip: string | null;
  createdAt: string;
  gym: { name: string; slug: string } | null;
}

export interface OnboardingGym {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  trialEndsAt: string | null;
  daysLeft: number | null;
  checklist: { hasMembers: boolean; hasCheckins: boolean; hasPayments: boolean };
  completedSteps: number;
  totalSteps: number;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function usePlatformOverview() {
  return useQuery({
    queryKey: ["platform", "overview"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PlatformOverview }>("/admin/platform/overview");
      return res.data.data;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useGyms(params: { search?: string; planTier?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["platform", "gyms", params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { data: GymRow[]; meta: { total: number; page: number; limit: number } } }>(
        "/admin/platform/gyms",
        { params },
      );
      return res.data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useGymDetail(gymId: string) {
  return useQuery({
    queryKey: ["platform", "gyms", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: GymDetail }>(`/admin/platform/gyms/${gymId}`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 30 * 1000,
  });
}

export function useImpersonate() {
  return useMutation({
    mutationFn: ({ gymId, reason }: { gymId: string; reason: string }) =>
      apiClient.post<{ data: { token: string; gymName: string; expiresIn: number; warning: string } }>(
        `/admin/platform/gyms/${gymId}/impersonate`,
        { reason },
      ),
    onError: () => toast.error("Impersonation failed"),
  });
}

export function useAuditLog(params: { gymId?: string; action?: string; entity?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["platform", "audit-log", params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { data: AuditLogEntry[]; meta: { total: number } } }>(
        "/admin/platform/audit-log",
        { params },
      );
      return res.data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useOnboardingPipeline() {
  return useQuery({
    queryKey: ["platform", "onboarding"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: OnboardingGym[] }>("/admin/platform/onboarding");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}
