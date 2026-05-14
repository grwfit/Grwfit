"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export interface CheckinResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  memberId: string;
  name: string;
  photoUrl: string | null;
  status: string;
  expiresAt: string | null;
  daysLeft: number | null;
  message: string;
  warningLevel: "ok" | "warn" | "block";
  checkedInAt: string;
}

export interface TickerEntry {
  id: string;
  checkedInAt: string;
  method: string;
  member: { id: string; name: string; photoUrl: string | null };
}

export interface HeatmapData {
  grid: number[][];
  days: number;
}

export interface NoShowEntry {
  id: string;
  name: string;
  phone: string;
  last_checkin: string | null;
  days_absent: number;
}

export function useCheckin() {
  const { gymId } = useAuth();
  return useMutation({
    mutationFn: async (dto: { memberId?: string; qrCode?: string; method: string; deviceId?: string }) => {
      const res = await apiClient.post<{ data: CheckinResult }>(`/gyms/${gymId}/checkins`, dto);
      return res.data.data;
    },
  });
}

export function useTodayCheckins() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["checkins-today", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { checkins: TickerEntry[]; total: number; peakHour: number | null } }>(
        `/gyms/${gymId}/checkins/today`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    refetchInterval: 10000, // Poll every 10s for dashboard
  });
}

export function useLiveTicker() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["checkins-ticker", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TickerEntry[] }>(`/gyms/${gymId}/checkins/ticker`);
      return res.data.data;
    },
    enabled: !!gymId,
    refetchInterval: 5000, // Poll every 5s for kiosk
  });
}

export function useHeatmap(days = 7) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["checkins-heatmap", gymId, days],
    queryFn: async () => {
      const res = await apiClient.get<{ data: HeatmapData }>(`/gyms/${gymId}/checkins/heatmap?days=${days}`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNoShows(days = 14) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["no-shows", gymId, days],
    queryFn: async () => {
      const res = await apiClient.get<{ data: NoShowEntry[] }>(`/gyms/${gymId}/checkins/no-shows?days=${days}`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMemberCheckinHistory(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["member-checkins", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{ id: string; checkedInAt: string; method: string }> }>(
        `/gyms/${gymId}/checkins/member/${memberId}`,
      );
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
  });
}

export function useCheckinSettings() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["checkin-settings", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { allowExpired: boolean; notifyWhatsApp: boolean; notifyMessage: string | null } }>(
        `/gyms/${gymId}/checkins/settings`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

export function useUpdateCheckinSettings() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { allowExpired?: boolean; notifyWhatsApp?: boolean; notifyMessage?: string }) => {
      await apiClient.put(`/gyms/${gymId}/checkins/settings`, dto);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checkin-settings", gymId] });
      toast.success("Settings saved");
    },
  });
}
