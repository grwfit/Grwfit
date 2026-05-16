"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

interface StaffUser {
  id: string;
  gymId: string;
  branchId: string | null;
  phone: string;
  email: string | null;
  name: string;
  role: "owner" | "manager" | "trainer" | "reception";
  commissionPct: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  branch: { id: string; name: string } | null;
}

interface ListStaffParams {
  page?: number;
  limit?: number;
  role?: string;
  branchId?: string;
  search?: string;
  isActive?: string;
}

interface StaffListResponse {
  items: StaffUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useStaffList(params: ListStaffParams = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["staff", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: StaffListResponse }>(`/gyms/${gymId}/staff`, {
        params: { page: 1, limit: 25, isActive: "true", ...params },
      });
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

export function useStaffMember(staffId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["staff", gymId, staffId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: StaffUser }>(`/gyms/${gymId}/staff/${staffId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!staffId,
  });
}

export function useCreateStaff() {
  const { gymId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      name: string;
      phone: string;
      role: string;
      branchId?: string;
      email?: string;
      commissionPct?: number;
    }) => {
      const res = await apiClient.post<{ data: StaffUser }>(`/gyms/${gymId}/staff`, dto);
      return res.data.data;
    },
    onSuccess: (staff) => {
      void qc.invalidateQueries({ queryKey: ["staff", gymId] });
      toast.success(`${staff.name} added. WhatsApp invite sent.`);
    },
    onError: (err: unknown) => {
      const msg = extractError(err) ?? "Failed to create staff member";
      toast.error(msg);
    },
  });
}

export function useUpdateStaff() {
  const { gymId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, ...dto }: { staffId: string; name?: string; role?: string; branchId?: string; email?: string; commissionPct?: number }) => {
      const res = await apiClient.put<{ data: StaffUser }>(`/gyms/${gymId}/staff/${staffId}`, dto);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff", gymId] });
      toast.success("Staff updated");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to update"),
  });
}

export function useDeactivateStaff() {
  const { gymId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      await apiClient.delete(`/gyms/${gymId}/staff/${staffId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff", gymId] });
      toast.success("Staff deactivated and sessions revoked");
    },
    onError: (err: unknown) => toast.error(extractError(err) ?? "Failed to deactivate"),
  });
}

export function useTrainers() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["trainers", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: string; name: string; phone: string }[] }>(
        `/gyms/${gymId}/staff/trainers`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

export function useBranches() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["branches", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: string; name: string; isPrimary: boolean }[] }>(
        `/gyms/${gymId}/branches`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

function extractError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
