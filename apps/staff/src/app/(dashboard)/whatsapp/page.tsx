"use client";

import Link from "next/link";
import { MessageSquare, Send, Zap, BarChart2, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useWhatsappCostStats, useBroadcastCampaigns } from "@/hooks/use-whatsapp";

function paiseToRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

const NAV_CARDS = [
  { href: "/whatsapp/templates", icon: MessageSquare, label: "Templates", desc: "Manage pre-approved Meta templates" },
  { href: "/whatsapp/broadcasts", icon: Send, label: "Broadcasts", desc: "Send bulk messages to members" },
  { href: "/whatsapp/triggers", icon: Zap, label: "Auto-Triggers", desc: "Configure event-based automation" },
];

export default function WhatsAppPage() {
  const { data: cost } = useWhatsappCostStats();
  const { data: campaigns } = useBroadcastCampaigns();

  const activeCampaigns = campaigns?.filter((c) => c.status === "running").length ?? 0;
  const completedCampaigns = campaigns?.filter((c) => c.status === "completed").length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Automate member communication via WhatsApp</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages This Month</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cost?.totalMessages ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cost ? paiseToRupees(cost.totalCostPaise) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCampaigns}</div>
            {activeCampaigns > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{activeCampaigns} running now</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {NAV_CARDS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="pt-6">
                <Icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold">{label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
