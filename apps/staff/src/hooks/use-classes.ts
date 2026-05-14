"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export interface ClassTemplate {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  durationMin: number;
  trainerId: string | null;
  recurrenceRule: string | null;
  isActive: boolean;
}

export interface ClassInstance {
  id: string;
  templateId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  trainerId: string | null;
  status: "scheduled" | "cancelled" | "completed";
  template: { name: string; durationMin: number };
  _count: { bookings: number; waitlist: number };
}

export interface ClassDetail extends ClassInstance {
  bookings: Array<{
    id: string;
    status: string;
    member: { id: string; name: string; phone: string; photoUrl: string | null };
  }>;
  waitlist: Array<{
    id: string;
    position: number;
    member: { id: string; name: string; phone: string };
  }>;
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function useClassTemplates() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["classes", "templates", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassTemplate[] }>(`/gyms/${gymId}/classes/templates`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTemplate() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; capacity: number; durationMin: number; trainerId?: string; recurrenceRule?: string }) =>
      apiClient.post(`/gyms/${gymId}/classes/templates`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes", "templates", gymId] });
      toast.success("Class template created");
    },
    onError: () => toast.error("Failed to create template"),
  });
}

// ── Instances ──────────────────────────────────────────────────────────────────

export function useClassInstances(params: { from?: string; to?: string; trainerId?: string } = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["classes", "instances", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassInstance[] }>(`/gyms/${gymId}/classes`, { params });
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 30 * 1000,
  });
}

export function useClassInstance(instanceId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["classes", "instance", gymId, instanceId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassDetail }>(`/gyms/${gymId}/classes/${instanceId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!instanceId,
    staleTime: 15 * 1000,
  });
}

export function useCreateInstance() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { templateId: string; startsAt: string; capacity?: number }) =>
      apiClient.post(`/gyms/${gymId}/classes`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes", "instances", gymId] });
      toast.success("Class scheduled");
    },
    onError: () => toast.error("Failed to schedule class"),
  });
}

export function useCancelInstance() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      apiClient.put(`/gyms/${gymId}/classes/${instanceId}`, { status: "cancelled" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes", "instances", gymId] });
      toast.success("Class cancelled");
    },
    onError: () => toast.error("Failed to cancel class"),
  });
}

// ── Bookings ───────────────────────────────────────────────────────────────────

export function useBookClass() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, memberId }: { instanceId: string; memberId: string }) =>
      apiClient.post(`/gyms/${gymId}/classes/book`, { instanceId, memberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes", "instances", gymId] });
      toast.success("Member booked");
    },
    onError: () => toast.error("Booking failed"),
  });
}

export function useMarkAttendance() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, memberIds }: { instanceId: string; memberIds: string[] }) =>
      apiClient.patch(`/gyms/${gymId}/classes/${instanceId}/attendance`, { memberIds }),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["classes", "instance", gymId, v.instanceId] });
      toast.success("Attendance marked");
    },
    onError: () => toast.error("Failed to mark attendance"),
  });
}
