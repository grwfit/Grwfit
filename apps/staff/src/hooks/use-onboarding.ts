"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface OnboardingProgress {
  gymId: string;
  currentStep: number;
  completedSteps: number[];
  stepData: Record<string, unknown>;
  completedAt: string | null;
  gym: {
    name: string;
    slug: string;
    trialEndsAt: string | null;
    planTier: string;
    status: string;
  } | null;
  daysLeft: number | null;
}

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ["onboarding", "progress"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: OnboardingProgress }>("/onboarding/progress");
      return res.data.data;
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

function makeStepMutation(step: number | "4/skip") {
  return (data?: unknown) => {
    const url = step === "4/skip" ? "/onboarding/step/4/skip" : `/onboarding/step/${step}`;
    return apiClient.post(url, data ?? {});
  };
}

export function useCompleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: number | "4/skip"; data?: unknown }) =>
      makeStepMutation(step)(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding", "progress"] });
    },
    onError: () => toast.error("Failed to save step"),
  });
}

export function useConvertTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planTier }: { planTier: string }) =>
      apiClient.post("/onboarding/convert", { planTier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding", "progress"] });
      toast.success("Welcome to GrwFit! Your gym is now active.");
    },
    onError: () => toast.error("Conversion failed. Please contact support."),
  });
}
