"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export interface Member {
  id: string;
  gymId: string;
  branchId: string | null;
  phone: string;
  email: string | null;
  name: string;
  dob: string | null;
  gender: string | null;
  photoUrl: string | null;
  status: "active" | "expired" | "frozen" | "trial";
  joinedAt: string;
  expiresAt: string | null;
  currentPlanId: string | null;
  assignedTrainerId: string | null;
  tags: string[];
  qrCode: string;
  branch: { id: string; name: string } | null;
  createdAt: string;
}

export interface MemberFull extends Member {
  address: { street?: string; city?: string; state?: string; pincode?: string } | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  goals: string[] | null;
  healthNotes: string | null;
  medicalConditions: string | null;
}

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  trainerId?: string;
  branchId?: string;
  planId?: string;
  joinedFrom?: string;
  joinedTo?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface Note {
  id: string;
  staffId: string;
  note: string;
  createdAt: string;
}

// ── List ──────────────────────────────────────────────────────────────────────

export function useMemberList(params: ListParams = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["members", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { items: Member[]; meta: { page: number; limit: number; total: number; totalPages: number } } }>(
        `/gyms/${gymId}/members`,
        { params: { page: 1, limit: 25, ...params } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

// ── Single ────────────────────────────────────────────────────────────────────

export function useMember(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["members", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MemberFull }>(`/gyms/${gymId}/members/${memberId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

interface CreateMemberDto {
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  branchId?: string;
  planId?: string;
  assignedTrainerId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthNotes?: string;
  medicalConditions?: string;
  tags?: string[];
}

export function useCreateMember() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMemberDto) => {
      const res = await apiClient.post<{ data: Member }>(`/gyms/${gymId}/members`, dto);
      return res.data.data;
    },
    onSuccess: (m) => {
      void qc.invalidateQueries({ queryKey: ["members", gymId] });
      toast.success(`${m.name} added. Welcome WhatsApp sent.`);
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to add member"),
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateMember() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...dto }: { memberId: string } & Partial<MemberFull>) => {
      const res = await apiClient.put<{ data: Member }>(`/gyms/${gymId}/members/${memberId}`, dto);
      return res.data.data;
    },
    onSuccess: (m) => {
      void qc.invalidateQueries({ queryKey: ["members", gymId, m.id] });
      void qc.invalidateQueries({ queryKey: ["members", gymId] });
      toast.success("Member updated");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to update"),
  });
}

// ── Freeze / Unfreeze ─────────────────────────────────────────────────────────

export function useFreezeMember() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, reason, untilDate }: { memberId: string; reason?: string; untilDate?: string }) => {
      await apiClient.put(`/gyms/${gymId}/members/${memberId}/freeze`, { reason, untilDate });
    },
    onSuccess: (_, { memberId }) => {
      void qc.invalidateQueries({ queryKey: ["members", gymId, memberId] });
      void qc.invalidateQueries({ queryKey: ["members", gymId] });
      toast.success("Member frozen");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to freeze"),
  });
}

export function useUnfreezeMember() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.put(`/gyms/${gymId}/members/${memberId}/unfreeze`);
    },
    onSuccess: (_, memberId) => {
      void qc.invalidateQueries({ queryKey: ["members", gymId, memberId] });
      void qc.invalidateQueries({ queryKey: ["members", gymId] });
      toast.success("Member unfrozen");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to unfreeze"),
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useMemberNotes(memberId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["member-notes", gymId, memberId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Note[] }>(`/gyms/${gymId}/members/${memberId}/notes`);
      return res.data.data;
    },
    enabled: !!gymId && !!memberId,
  });
}

export function useAddNote(memberId: string) {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      await apiClient.post(`/gyms/${gymId}/members/${memberId}/notes`, { note });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["member-notes", gymId, memberId] });
      toast.success("Note added");
    },
  });
}

// ── Bulk ──────────────────────────────────────────────────────────────────────

export function useBulkAction() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { memberIds: string[]; action: string; tag?: string; trainerId?: string; message?: string }) => {
      const res = await apiClient.post<{ data: Record<string, unknown> }>(`/gyms/${gymId}/members/bulk`, dto);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members", gymId] });
      toast.success("Bulk action completed");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Bulk action failed"),
  });
}

function extractError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
