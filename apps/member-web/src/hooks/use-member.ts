"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface MemberMe {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  status: "active" | "expired" | "frozen" | "trial";
  expiresAt: string | null;
  daysLeft: number | null;
  planName: string | null;
  planPricePaise: number | null;
  branchName: string | null;
  streak: number;
  onboardingCompleted: boolean;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  week: Record<string, Array<string>>;
  isActive: boolean;
  updatedAt: string;
}

export interface DietPlan {
  id: string;
  meals: Record<string, Array<string>>;
  calories: number | null;
  macros: { protein: number; carbs: number; fat: number } | null;
  isActive: boolean;
}

export interface ProgressLog {
  id: string;
  weightGrams: number | null;
  measurements: Record<string, number> | null;
  photoUrls: string[];
  notes: string | null;
  loggedAt: string;
}

export interface Payment {
  id: string;
  totalPaise: number;
  mode: string;
  status: string;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  paidAt: string;
  plan: { name: string } | null;
}

export interface CheckinData {
  recent: Array<{ id: string; checkedInAt: string; method: string }>;
  monthlyCount: number;
}

// ── Me ─────────────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ["member", "me"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MemberMe }>("/members/me");
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

// ── Workout plan ───────────────────────────────────────────────────────────────

export function useWorkoutPlan() {
  return useQuery({
    queryKey: ["member", "workout-plan"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: WorkoutPlan | null }>("/members/me/workout-plan");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Diet plan ──────────────────────────────────────────────────────────────────

export function useDietPlan() {
  return useQuery({
    queryKey: ["member", "diet-plan"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DietPlan | null }>("/members/me/diet-plan");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Progress ───────────────────────────────────────────────────────────────────

export function useProgress() {
  return useQuery({
    queryKey: ["member", "progress"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ProgressLog[] }>("/members/me/progress");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useLogProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { weightGrams?: number; notes?: string; measurements?: Record<string, number> }) =>
      apiClient.post("/members/me/progress", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", "progress"] });
      toast.success("Progress logged!");
    },
    onError: () => toast.error("Failed to log progress"),
  });
}

// ── Payments ───────────────────────────────────────────────────────────────────

export function usePayments() {
  return useQuery({
    queryKey: ["member", "payments"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Payment[] }>("/members/me/payments");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Check-ins ──────────────────────────────────────────────────────────────────

export function useCheckins() {
  return useQuery({
    queryKey: ["member", "checkins"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CheckinData }>("/members/me/checkins");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}
