"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@grwfit/ui";
import { useRenewalConfigs, useUpdateRenewalConfig } from "@/hooks/use-renewals";
import { usePermission } from "@/hooks/use-permission";

const TRIGGER_LABELS: Record<string, { label: string; description: string }> = {
  days_7_before: { label: "7 days before expiry",  description: "Friendly reminder to renew" },
  days_3_before: { label: "3 days before expiry",  description: "Reminder + optional offer" },
  days_1_before: { label: "1 day before expiry",   description: "Urgent reminder" },
  on_expiry:     { label: "On expiry day",          description: "Win-back message" },
  days_7_after:  { label: "7 days after expiry",   description: "Final attempt" },
  days_30_after: { label: "30 days after expiry",  description: "Stop messaging, mark dormant" },
};

export default function RenewalSettingsPage() {
  const router = useRouter();
  const canEdit = usePermission("dashboard", "view");
  const { data: configs, isLoading } = useRenewalConfigs();
  const update = useUpdateRenewalConfig();

  const handleToggle = (triggerType: string, current: boolean) => {
    update.mutate({ triggerType, isActive: !current });
  };

  const handleOfferToggle = (triggerType: string, current: boolean) => {
    update.mutate({ triggerType, includeOffer: !current });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Renewal Settings</h1>
          <p className="text-sm text-muted-foreground">Configure automatic reminders for your gym</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Reminder Schedule</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))
            : configs?.map((config) => {
                const info = TRIGGER_LABELS[config.triggerType] ?? { label: config.triggerType, description: "" };
                return (
                  <div key={config.id} className="flex items-center justify-between px-6 py-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                      {config.template && (
                        <p className="text-xs text-primary mt-1 truncate">
                          Template: {config.template.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Offer toggle for 3-day reminder */}
                      {config.triggerType === "days_3_before" && (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input type="checkbox"
                            checked={config.includeOffer}
                            onChange={() => canEdit && handleOfferToggle(config.triggerType, config.includeOffer)}
                            disabled={!canEdit || update.isPending}
                            className="rounded"
                          />
                          10% offer
                        </label>
                      )}

                      {/* Active toggle */}
                      <button
                        onClick={() => canEdit && handleToggle(config.triggerType, config.isActive)}
                        disabled={!canEdit || update.isPending}
                        className="transition-colors disabled:opacity-50"
                        title={config.isActive ? "Click to disable" : "Click to enable"}
                      >
                        {config.isActive
                          ? <ToggleRight className="h-7 w-7 text-primary" />
                          : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                );
              })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Reminders are sent automatically via WhatsApp every hour. Members who have opted out will not receive messages.
      </p>
    </div>
  );
}
