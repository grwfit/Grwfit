"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export interface WebsiteData {
  website: {
    id: string;
    templateId: string;
    customDomain: string | null;
    sslStatus: string;
    isPublished: boolean;
    content: Record<string, unknown>;
    seoMeta: { title?: string; description?: string; ogImage?: string | null };
    publishedAt: string | null;
    updatedAt: string;
  } | null;
  gym: {
    slug: string;
    name: string;
    phone: string;
    address: Record<string, string>;
    logoUrl: string | null;
  };
  plans: Array<{ id: string; name: string; pricePaise: number; durationDays: number }>;
  trainers: Array<{ id: string; name: string }>;
}

export function useWebsite() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["website", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: WebsiteData }>(`/gyms/${gymId}/website`);
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateWebsite() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { templateId?: string; content?: Record<string, unknown>; seoMeta?: Record<string, unknown> }) =>
      apiClient.put(`/gyms/${gymId}/website`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website", gymId] });
      toast.success("Website saved");
    },
    onError: () => toast.error("Failed to save"),
  });
}

export function usePublishWebsite() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (publish: boolean) =>
      apiClient.post(`/gyms/${gymId}/website/${publish ? "publish" : "unpublish"}`, {}),
    onSuccess: (_, publish) => {
      qc.invalidateQueries({ queryKey: ["website", gymId] });
      toast.success(publish ? "Website published!" : "Website unpublished");
    },
    onError: () => toast.error("Failed"),
  });
}

export function useConnectDomain() {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) =>
      apiClient.post<{ data: { domain: string; cnameTarget: string; instructions: string[] } }>(
        `/gyms/${gymId}/website/connect-domain`, { domain },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website", gymId] }),
    onError: () => toast.error("Failed to connect domain"),
  });
}

export function useWebsiteAnalytics() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["website", "analytics", gymId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{ date: string; views: number; uniqueVisitors: number; leadsGenerated: number }> }>(
        `/gyms/${gymId}/website/analytics`,
      );
      return res.data.data;
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}
