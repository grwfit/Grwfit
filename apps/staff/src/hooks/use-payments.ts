"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  durationDays: number;
  isActive: boolean;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string;
  planId: string | null;
  amountPaise: number;
  gstPct: string;
  gstAmountPaise: number;
  totalPaise: number;
  mode: "upi" | "cash" | "card" | "bank_transfer" | "razorpay";
  status: "pending" | "captured" | "failed" | "refunded" | "partially_refunded";
  txnRef: string | null;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  paidAt: string;
  member: { id: string; name: string; phone: string };
  plan: { name: string } | null;
  refunds?: Array<{ id: string; amountPaise: number; reason: string; status: string; createdAt: string }>;
}

export interface CashReconciliation {
  id: string;
  date: string;
  expectedPaise: number;
  actualPaise: number;
  variancePaise: number;
  status: "open" | "submitted" | "approved" | "rejected";
  notes: string | null;
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export function usePlans() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["plans", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Plan[] }>(`/gyms/${gymId}/plans`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlan() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; pricePaise: number; durationDays: number; description?: string }) => {
      const res = await apiClient.post<{ data: Plan }>(`/gyms/${gymId}/plans`, dto);
      return res.data.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["plans", gymId] }); toast.success("Plan created"); },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to create plan"),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function usePaymentList(params: {
  page?: number; memberId?: string; mode?: string; status?: string;
  from?: string; to?: string; search?: string;
} = {}) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["payments", gymId, params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { items: Payment[]; meta: { page: number; total: number; totalPages: number; limit: number } } }>(
        `/gyms/${gymId}/payments`,
        { params: { page: 1, limit: 25, ...params } },
      );
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

export function usePayment(paymentId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["payments", gymId, paymentId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Payment }>(`/gyms/${gymId}/payments/${paymentId}`);
      return res.data.data;
    },
    enabled: !!gymId && !!paymentId,
  });
}

export function useCreatePayment() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      memberId: string; planId?: string; totalPaise: number;
      mode: string; txnRef?: string; notes?: string;
    }) => {
      const res = await apiClient.post<{ data: Payment }>(`/gyms/${gymId}/payments`, dto);
      return res.data.data;
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["payments", gymId] });
      void qc.invalidateQueries({ queryKey: ["members", gymId, p.memberId] });
      toast.success(`Payment recorded. Invoice ${p.invoiceNumber ?? "generating..."}`);
    },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to record payment"),
  });
}

export function useRefund(paymentId: string) {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { amountPaise: number; reason: string }) => {
      await apiClient.post(`/gyms/${gymId}/payments/${paymentId}/refund`, dto);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments", gymId, paymentId] });
      toast.success("Refund processed");
    },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Refund failed"),
  });
}

// ── Cash Reconciliation ───────────────────────────────────────────────────────

export function useCashReconciliations() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["cash-recon", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CashReconciliation[] }>(`/gyms/${gymId}/payments/cash-reconciliation`);
      return res.data.data;
    },
    enabled: !!gymId,
  });
}

export function useSubmitReconciliation() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { date?: string; actualPaise?: number; notes?: string }) => {
      await apiClient.post(`/gyms/${gymId}/payments/cash-reconciliation`, dto);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cash-recon", gymId] });
      toast.success("Reconciliation submitted");
    },
    onError: (e: unknown) => toast.error(extractError(e) ?? "Failed to submit"),
  });
}

export function useApproveReconciliation() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reconId: string) => {
      await apiClient.put(`/gyms/${gymId}/payments/cash-reconciliation/${reconId}/approve`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cash-recon", gymId] });
      toast.success("Approved");
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
