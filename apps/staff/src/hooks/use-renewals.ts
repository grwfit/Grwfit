"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export type Bucket =
  | "today" | "week" | "month"
  | "expired_7" | "expired_30" | "expired_90" | "expired_old";

export interface BucketStat { count: number; revenuePaise: number }

export interface DashboardSummary {
  today: BucketStat; week: BucketStat; month: BucketStat;
  expired_7: BucketStat; expired_30: BucketStat;
  expired_90: BucketStat; expired_old: BucketStat;
}

export interface RenewalMember {
  id: string; name: string; phone: string;
  expiresAt: string | null; daysToExpiry: number | null;
  status: string; planName: string | null; pricePaise: number | null;
  lastContactedAt: string | null; bucket: string;
}

export interface FollowUp {
  id: string; memberId: string; outcome: string; notes: string | null;
  followUpAt: string | null; createdAt: string; daysInFollowUp: number;
  member: { id: string; name: string; phone: string; expiresAt: string | null; status: string };
}

export interface RenewalConfig {
  id: string; triggerType: string; isActive: boolean;
  includeOffer: boolean; offerPct: number | null;
  template: { id: string; name: string; body: string } | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useRenewalsDashboard(params: {
  bucket?: Bucket; branchId?: string; trainerId?: string;
  planId?: string; page?: number;
} = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["renewals", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { summary: DashboardSummary; members: RenewalMember[] } }>(
        `/gyms/${gymId}/renewals`,
        { params: { page: 1, limit: 50, ...params } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 2 * 60 * 1000, // 2 min (server cache is 5 min)
  });
}

// ── Send reminder ─────────────────────────────────────────────────────────────

export function useSendReminder() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { memberId: string; triggerType?: string }) => {
      const res = await apiClient.post<{ data: { sent: boolean; channel: string } }>(
        `/gyms/${gymId}/renewals/remind`, dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["renewals", gymId] });
      toast.success("Reminder sent via WhatsApp");
    },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to send reminder"),
  });
}

// ── Bulk reminder ─────────────────────────────────────────────────────────────

export function useBulkReminder() {
  const { gymId } = useAuth();
  return useMutation({
    mutationFn: async (dto: { bucket?: Bucket; memberIds?: string[] }) => {
      const res = await apiClient.post<{ data: { queued: number } }>(
        `/gyms/${gymId}/renewals/remind/bulk`, dto,
      );
      return res.data.data;
    },
    onSuccess: (data) => toast.success(`${data.queued} reminders queued`),
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to queue reminders"),
  });
}

// ── Mark contacted ────────────────────────────────────────────────────────────

export function useMarkContacted() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      memberId: string;
      outcome: "contacted" | "interested" | "not_interested" | "converted" | "no_answer";
      notes?: string;
      followUpAt?: string;
    }) => {
      const res = await apiClient.post<{ data: unknown }>(`/gyms/${gymId}/renewals/follow-up`, dto);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["renewals", gymId] });
      toast.success("Outcome logged");
    },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to log outcome"),
  });
}

// ── Follow-up pipeline ────────────────────────────────────────────────────────

export function useFollowUps(page = 1) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["renewal-followups", gymId, page],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FollowUp[] }>(
        `/gyms/${gymId}/renewals/follow-ups`, { params: { page } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

// ── Config ────────────────────────────────────────────────────────────────────

export function useRenewalConfigs() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["renewal-configs", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: RenewalConfig[] }>(`/gyms/${gymId}/renewals/config`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateRenewalConfig() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ triggerType, ...dto }: { triggerType: string; isActive?: boolean; includeOffer?: boolean; offerPct?: number; templateId?: string }) => {
      await apiClient.put(`/gyms/${gymId}/renewals/config/${triggerType}`, dto);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["renewal-configs", gymId] });
      toast.success("Config saved");
    },
  });
}

function extractError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
