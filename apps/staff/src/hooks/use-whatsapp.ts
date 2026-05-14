"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TemplateStatus = "pending" | "approved" | "rejected";
export type BroadcastStatus = "draft" | "scheduled" | "running" | "completed" | "cancelled" | "failed";

export interface WhatsappTemplate {
  id: string;
  name: string;
  metaTemplateId: string | null;
  body: string;
  variables: string[];
  category: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  status: BroadcastStatus;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledFor: string | null;
  createdAt: string;
  completedAt: string | null;
  template: { name: string; status: string };
}

export interface TriggerRule {
  id: string;
  event: string;
  isActive: boolean;
  config: Record<string, unknown>;
  template: { id: string; name: string; status: string } | null;
}

export interface WhatsappMessage {
  id: string;
  toPhone: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  costPaise: number | null;
  createdAt: string;
  template: { name: string } | null;
  member: { name: string; phone: string } | null;
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function useWhatsappTemplates() {
  return useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: WhatsappTemplate[] }>("/whatsapp/templates");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; metaTemplateId?: string; body: string; variables: string[]; category?: string }) =>
      apiClient.post("/whatsapp/templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      toast.success("Template created");
    },
    onError: () => toast.error("Failed to create template"),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; metaTemplateId?: string; body?: string; variables?: string[] }) =>
      apiClient.put(`/whatsapp/templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      toast.success("Template updated — pending re-approval");
    },
    onError: () => toast.error("Failed to update template"),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/whatsapp/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });
}

export function useTestSendTemplate() {
  return useMutation({
    mutationFn: ({ id, phone, variables }: { id: string; phone: string; variables: string[] }) =>
      apiClient.post(`/whatsapp/templates/${id}/test-send`, { phone, variables }),
    onSuccess: () => toast.success("Test message sent"),
    onError: () => toast.error("Test send failed"),
  });
}

// ── Broadcast Campaigns ────────────────────────────────────────────────────────

export function useBroadcastCampaigns() {
  return useQuery({
    queryKey: ["whatsapp", "broadcasts"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: BroadcastCampaign[] }>("/whatsapp/broadcasts");
      return res.data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; templateId: string; audienceFilter?: Record<string, unknown>; scheduledFor?: string }) =>
      apiClient.post("/whatsapp/broadcasts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "broadcasts"] });
      toast.success("Campaign created");
    },
    onError: () => toast.error("Failed to create campaign"),
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/whatsapp/broadcasts/${id}/send`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "broadcasts"] });
      toast.success("Campaign queued for sending");
    },
    onError: () => toast.error("Failed to send campaign"),
  });
}

export function useCancelBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/whatsapp/broadcasts/${id}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "broadcasts"] });
      toast.success("Campaign cancelled");
    },
    onError: () => toast.error("Failed to cancel campaign"),
  });
}

export function useAudienceCount() {
  return useMutation({
    mutationFn: (filter: { status?: string; trainerId?: string; branchId?: string }) =>
      apiClient.post<{ data: { count: number } }>("/whatsapp/broadcasts/audience-count", filter),
  });
}

// ── Trigger Rules ──────────────────────────────────────────────────────────────

export function useTriggerRules() {
  return useQuery({
    queryKey: ["whatsapp", "triggers"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TriggerRule[] }>("/whatsapp/trigger-rules");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpsertTriggerRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ event, ...data }: { event: string; isActive: boolean; templateId?: string; config?: Record<string, unknown> }) =>
      apiClient.put(`/whatsapp/trigger-rules/${event}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "triggers"] });
      toast.success("Trigger rule saved");
    },
    onError: () => toast.error("Failed to save trigger rule"),
  });
}

// ── Cost Stats ─────────────────────────────────────────────────────────────────

export function useWhatsappCostStats(month?: string) {
  const m = month ?? new Date().toISOString().substring(0, 7);
  return useQuery({
    queryKey: ["whatsapp", "cost", m],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { totalMessages: number; totalCostPaise: number; month: string } }>(
        `/whatsapp/stats/cost?month=${m}`,
      );
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
