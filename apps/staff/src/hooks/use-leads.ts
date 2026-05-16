"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

export type LeadSource = "walk_in" | "website" | "whatsapp" | "phone_call" | "instagram" | "referral" | "other";
export type LeadStatus = "open" | "converted" | "lost";
export type LeadActivityType = "note" | "call" | "whatsapp" | "email" | "visit" | "stage_change" | "converted";

export interface LeadStage {
  id: string;
  name: string;
  position: number;
  color: string;
  isDefault: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  stageId: string | null;
  assignedTo: string | null;
  tags: string[];
  status: LeadStatus;
  lostReason: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  stage?: { name: string; color: string } | null;
}

export interface KanbanColumn extends LeadStage {
  leads: Lead[];
}

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  notes: string | null;
  metadata: Record<string, unknown>;
  staffId: string | null;
  createdAt: string;
}

export interface LeadDetail extends Lead {
  stage: LeadStage | null;
  activities: LeadActivity[];
}

export interface FunnelReport {
  bySource: Array<{ source: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  conversionRate: number;
  totalLeads: number;
  convertedCount: number;
  period: string;
}

// ── Kanban ─────────────────────────────────────────────────────────────────────

export function useKanban() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", "kanban", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: KanbanColumn[] }>(`/gyms/${gymId}/leads/kanban`);
      return res.data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!gymId,
  });
}

export function useMoveLead() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      apiClient.patch(`/gyms/${gymId}/leads/${leadId}/move`, { stageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", "kanban", gymId] }),
    onError: () => toast.error("Failed to move lead"),
  });
}

// ── Leads CRUD ─────────────────────────────────────────────────────────────────

export function useLeads(params: Record<string, unknown> = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", "list", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { data: Lead[]; meta: { page: number; total: number } } }>(
        `/gyms/${gymId}/leads`, { params },
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 30 * 1000,
  });
}

export function useLead(leadId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", gymId, leadId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeadDetail }>(`/gyms/${gymId}/leads/${leadId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!leadId,
    staleTime: 15 * 1000,
  });
}

export function useCreateLead() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; phone: string; email?: string; source?: string; stageId?: string }) =>
      apiClient.post(`/gyms/${gymId}/leads`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", "kanban", gymId] });
      toast.success("Lead added");
    },
    onError: () => toast.error("Failed to add lead"),
  });
}

export function useUpdateLead() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; [k: string]: unknown }) =>
      apiClient.put(`/gyms/${gymId}/leads/${id}`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["leads", gymId, v.id] });
      qc.invalidateQueries({ queryKey: ["leads", "kanban", gymId] });
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update lead"),
  });
}

export function useMarkLost() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason?: string }) =>
      apiClient.patch(`/gyms/${gymId}/leads/${leadId}/lost`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", "kanban", gymId] });
      toast.success("Lead marked lost");
    },
    onError: () => toast.error("Failed to mark lead lost"),
  });
}

export function useConvertLead() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...dto }: { leadId: string; planId?: string; branchId?: string }) =>
      apiClient.post<{ data: { member: { id: string } } }>(`/gyms/${gymId}/leads/${leadId}/convert`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", "kanban", gymId] });
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Lead converted to member!");
    },
    onError: () => toast.error("Failed to convert lead"),
  });
}

// ── Activities ─────────────────────────────────────────────────────────────────

export function useAddActivity() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...dto }: { leadId: string; type: string; notes?: string }) =>
      apiClient.post(`/gyms/${gymId}/leads/${leadId}/activities`, dto),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["leads", gymId, v.leadId] });
      toast.success("Activity logged");
    },
    onError: () => toast.error("Failed to log activity"),
  });
}

// ── Stages ─────────────────────────────────────────────────────────────────────

export function useLeadStages() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", "stages", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeadStage[] }>(`/gyms/${gymId}/leads/stages`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Funnel ─────────────────────────────────────────────────────────────────────

export function useFunnelReport(days = 30) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", "funnel", gymId, days],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FunnelReport }>(
        `/gyms/${gymId}/leads/reports/funnel?days=${days}`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}
