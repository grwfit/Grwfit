"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import type { DatePreset } from "@/components/reports/date-range-filter";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyPoint { date: string; totalPaise?: number; count: number }

export interface RevenueReport {
  totalPaise: number;
  totalCount: number;
  prevTotalPaise: number;
  growth: number | null;
  dailySeries: Array<{ date: string; totalPaise: number; count: number }>;
  byPlan: Array<{ planId: string | null; planName: string; totalPaise: number; count: number }>;
  byMode: Array<{ mode: string; totalPaise: number; count: number }>;
}

export interface MemberReport {
  total: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  newSignups: number;
  churnedCount: number;
  churnRate: number;
  genderBreakdown: Array<{ gender: string; count: number }>;
  signupSeries: Array<{ date: string; count: number }>;
}

export interface AttendanceReport {
  dailySeries: Array<{ date: string; count: number }>;
  heatmap: Array<{ dow: number; hour: number; count: number }>;
  topMembers: Array<{ memberId: string; name: string; count: number }>;
  atRisk: Array<{ id: string; name: string; phone: string; expiresAt: string | null }>;
}

export interface TrainerPerformanceRow {
  id: string;
  name: string;
  commissionPct: number;
  memberCount: number;
  commissionPaise: number;
}

export interface CohortRow { cohortMonth: string; periodMonth: number; count: number }

// ── Helper ─────────────────────────────────────────────────────────────────────

function buildParams(preset: DatePreset, from?: string, to?: string, branchId?: string) {
  return { preset, ...(from && { from }), ...(to && { to }), ...(branchId && { branchId }) };
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useRevenueReport(preset: DatePreset = "30d", from?: string, to?: string, branchId?: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["reports", "revenue", gymId, preset, from, to, branchId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: RevenueReport }>(
        `/gyms/${gymId}/reports/revenue`,
        { params: buildParams(preset, from, to, branchId) },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberReport(preset: DatePreset = "30d", from?: string, to?: string, branchId?: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["reports", "members", gymId, preset, from, to, branchId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MemberReport }>(
        `/gyms/${gymId}/reports/members`,
        { params: buildParams(preset, from, to, branchId) },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCohortRetention(months = 6) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["reports", "cohort", gymId, months],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CohortRow[] }>(
        `/gyms/${gymId}/reports/members/cohort-retention?months=${months}`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAttendanceReport(preset: DatePreset = "30d", from?: string, to?: string, trainerId?: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["reports", "attendance", gymId, preset, from, to, trainerId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AttendanceReport }>(
        `/gyms/${gymId}/reports/attendance`,
        { params: { ...buildParams(preset, from, to), ...(trainerId && { trainerId }) } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrainerPerformanceReport(preset: DatePreset = "30d") {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["reports", "trainers", gymId, preset],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TrainerPerformanceRow[] }>(
        `/gyms/${gymId}/reports/trainers`,
        { params: { preset } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}
