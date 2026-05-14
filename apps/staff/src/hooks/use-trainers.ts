"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TrainerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  commissionPct: string | null;
  branchId: string | null;
  memberCount: number;
  lastLoginAt: string | null;
  branch: { name: string } | null;
}

export interface Commission {
  id: string;
  trainerId: string;
  memberId: string;
  amountPaise: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  payment: { invoiceNumber: string | null; paidAt: string; totalPaise: number } | null;
}

export interface PayoutRow {
  trainer: { id: string; name: string; phone: string };
  totalPaise: number;
  count: number;
}

export interface WorkoutPlan {
  id: string;
  memberId: string;
  trainerId: string | null;
  name: string;
  week: Record<string, unknown[]>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DietPlan {
  id: string;
  memberId: string;
  meals: Record<string, unknown[]>;
  calories: number | null;
  macros: { protein: number; carbs: number; fat: number } | null;
  isActive: boolean;
  updatedAt: string;
}

export interface ProgressLog {
  id: string;
  weightGrams: number | null;
  measurements: Record<string, number> | null;
  photoUrls: string[];
  notes: string | null;
  loggedAt: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  exercises: unknown[];
  isPublic: boolean;
}

// ── Trainers ───────────────────────────────────────────────────────────────────

export function useTrainersList() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["trainers", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TrainerProfile[] }>(`/gyms/${gymId}/trainers`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerDashboard() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["trainers", "dashboard", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { memberCount: number; pendingCommissionPaise: number; pendingCommissionCount: number; recentMembers: unknown[] } }>(
        `/gyms/${gymId}/trainers/dashboard`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 60 * 1000,
  });
}

export function useAssignTrainer() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, trainerId }: { memberId: string; trainerId: string }) =>
      apiClient.post(`/gyms/${gymId}/trainers/assign/${memberId}`, { trainerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainers", gymId] });
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Trainer assigned");
    },
    onError: () => toast.error("Failed to assign trainer"),
  });
}

// ── Commissions ────────────────────────────────────────────────────────────────

export function useCommissions(params: { trainerId?: string; status?: string; month?: string } = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["commissions", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Commission[]; meta: { total: number } }>(
        `/gyms/${gymId}/trainers/commissions/list`, { params },
      );
      return res.data;
    },
    enabled: !!gymId,
    staleTime: 60 * 1000,
  });
}

export function usePayoutReport(month?: string) {
  const { gymId } = useAuth();
  const m = month ?? new Date().toISOString().substring(0, 7);
  return useQuery({
    queryKey: ["commissions", "payout", gymId, m],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PayoutRow[] }>(
        `/gyms/${gymId}/trainers/commissions/payout-report?month=${m}`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useApproveCommissions() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post(`/gyms/${gymId}/trainers/commissions/approve`, { commissionIds: ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions", gymId] });
      toast.success("Commissions approved");
    },
    onError: () => toast.error("Failed to approve"),
  });
}

export function useMarkCommissionsPaid() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      apiClient.post(`/gyms/${gymId}/trainers/commissions/mark-paid`, { commissionIds: ids, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions", gymId] });
      toast.success("Commissions marked as paid");
    },
    onError: () => toast.error("Failed to mark paid"),
  });
}

// ── Workout Plans ──────────────────────────────────────────────────────────────

export function useWorkoutPlan(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["plans", "workout", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: WorkoutPlan | null }>(`/gyms/${gymId}/plans/workout/${memberId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
    staleTime: 60 * 1000,
  });
}

export function useCreateWorkoutPlan() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { memberId: string; name: string; week: Record<string, unknown[]> }) =>
      apiClient.post(`/gyms/${gymId}/plans/workout`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["plans", "workout", gymId, v.memberId] });
      toast.success("Workout plan saved");
    },
    onError: () => toast.error("Failed to save plan"),
  });
}

export function useUpdateWorkoutPlan() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, memberId, ...dto }: { planId: string; memberId: string; week?: Record<string, unknown[]>; name?: string }) =>
      apiClient.put(`/gyms/${gymId}/plans/workout/${planId}`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["plans", "workout", gymId, v.memberId] });
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });
}

// ── Diet Plans ─────────────────────────────────────────────────────────────────

export function useDietPlan(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["plans", "diet", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DietPlan | null }>(`/gyms/${gymId}/plans/diet/${memberId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
    staleTime: 60 * 1000,
  });
}

export function useCreateDietPlan() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { memberId: string; meals: Record<string, unknown[]>; calories?: number }) =>
      apiClient.post(`/gyms/${gymId}/plans/diet`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["plans", "diet", gymId, v.memberId] });
      toast.success("Diet plan saved");
    },
    onError: () => toast.error("Failed to save diet plan"),
  });
}

// ── Progress ───────────────────────────────────────────────────────────────────

export function useProgressLogs(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["plans", "progress", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ProgressLog[] }>(`/gyms/${gymId}/plans/progress/${memberId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
    staleTime: 60 * 1000,
  });
}

export function useLogProgress() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { memberId: string; weightGrams?: number; notes?: string; measurements?: Record<string, number> }) =>
      apiClient.post(`/gyms/${gymId}/plans/progress`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["plans", "progress", gymId, v.memberId] });
      toast.success("Progress logged");
    },
    onError: () => toast.error("Failed to log progress"),
  });
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function useWorkoutTemplates() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["plans", "templates", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: WorkoutTemplate[] }>(`/gyms/${gymId}/plans/workout-templates`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}
