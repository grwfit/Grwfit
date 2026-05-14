"use client";

import { useState } from "react";
import {
  Globe, CheckCircle, Clock, ExternalLink, Eye, EyeOff,
  Link2, BarChart2, Palette,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useWebsite, useUpdateWebsite, usePublishWebsite, useConnectDomain, useWebsiteAnalytics } from "@/hooks/use-website";

const TEMPLATES = [
  { id: "modern",  label: "Modern",  desc: "Clean white-space, gradient hero, indigo accent" },
  { id: "bold",    label: "Bold",    desc: "Dark gym aesthetic, yellow highlights, high-contrast" },
  { id: "classic", label: "Classic", desc: "Traditional, trust-focused, clean table layout" },
];

const SSL_CONFIG = {
  active:  { icon: CheckCircle, color: "text-green-500", label: "SSL Active" },
  pending: { icon: Clock,       color: "text-yellow-500", label: "SSL Pending" },
  failed:  { icon: Clock,       color: "text-red-500",    label: "SSL Failed" },
};

export default function WebsitePage() {
  const { data, isLoading } = useWebsite();
  const updateWebsite = useUpdateWebsite();
  const publishWebsite = usePublishWebsite();
  const connectDomain = useConnectDomain();
  const { data: analytics } = useWebsiteAnalytics();

  const [activeTab, setActiveTab] = useState<"content" | "design" | "domain" | "analytics">("content");
  const [domain, setDomain] = useState("");
  const [domainResult, setDomainResult] = useState<{ cnameTarget: string; instructions: string[] } | null>(null);

  // Local editable state for content
  const [hero, setHero] = useState<Record<string, string>>({});
  const [about, setAbout] = useState<Record<string, string>>({});
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  const w = data?.website;
  const isPublished = w?.isPublished ?? false;
  const siteUrl = w?.customDomain
    ? `https://${w.customDomain}`
    : `https://${data?.gym.slug ?? ""}.grwfit.com`;

  const handleSaveContent = () => {
    const existing = (w?.content ?? {}) as Record<string, unknown>;
    updateWebsite.mutate({
      content: {
        ...existing,
        hero: { ...(existing["hero"] as object ?? {}), ...hero },
        about: { ...(existing["about"] as object ?? {}), ...about },
      },
      seoMeta: {
        ...(w?.seoMeta ?? {}),
        ...(seoTitle && { title: seoTitle }),
        ...(seoDesc && { description: seoDesc }),
      },
    });
  };

  const handleConnectDomain = () => {
    if (!domain.trim()) return;
    connectDomain.mutate(domain.trim(), {
      onSuccess: (res) => setDomainResult(res.data.data),
    });
  };

  const totalViews = analytics?.reduce((s, r) => s + r.views, 0) ?? 0;
  const totalLeads = analytics?.reduce((s, r) => s + r.leadsGenerated, 0) ?? 0;

  const TABS = [
    { key: "content",   label: "Content",  icon: Globe },
    { key: "design",    label: "Design",   icon: Palette },
    { key: "domain",    label: "Domain",   icon: Link2 },
    { key: "analytics", label: "Analytics",icon: BarChart2 },
  ] as const;

  if (isLoading) {
    return <div className="p-6"><div className="h-64 rounded-lg bg-muted animate-pulse" /></div>;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website</h1>
          <div className="flex items-center gap-2 mt-1">
            <a href={siteUrl} target="_blank" rel="noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1">
              {siteUrl} <ExternalLink className="h-3 w-3" />
            </a>
            {w?.customDomain && (() => {
              const ssl = SSL_CONFIG[w.sslStatus as keyof typeof SSL_CONFIG] ?? SSL_CONFIG.pending;
              const SslIcon = ssl.icon;
              return <span className={`text-xs flex items-center gap-1 ${ssl.color}`}><SslIcon className="h-3 w-3" />{ssl.label}</span>;
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => publishWebsite.mutate(!isPublished)}
            disabled={publishWebsite.isPending}
          >
            {isPublished ? <><EyeOff className="h-4 w-4 mr-1.5" /> Unpublish</> : <><Eye className="h-4 w-4 mr-1.5" /> Publish</>}
          </Button>
          {isPublished && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Live
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Content tab */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Headline</label>
                <Input
                  defaultValue={(w?.content as Record<string, Record<string, string>>)?.["hero"]?.["headline"] ?? ""}
                  onChange={(e) => setHero((p) => ({ ...p, headline: e.target.value }))}
                  placeholder="Transform Your Body. Transform Your Life."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Subheadline</label>
                <Input
                  defaultValue={(w?.content as Record<string, Record<string, string>>)?.["hero"]?.["subheadline"] ?? ""}
                  onChange={(e) => setHero((p) => ({ ...p, subheadline: e.target.value }))}
                  placeholder="Join us for world-class training..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CTA Button Text</label>
                <Input
                  defaultValue={(w?.content as Record<string, Record<string, string>>)?.["hero"]?.["ctaText"] ?? "Book a Free Trial"}
                  onChange={(e) => setHero((p) => ({ ...p, ctaText: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">About Section</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <Input
                  defaultValue={(w?.content as Record<string, Record<string, string>>)?.["about"]?.["title"] ?? ""}
                  onChange={(e) => setAbout((p) => ({ ...p, title: e.target.value }))}
                  placeholder="About Us"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Body Text</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  defaultValue={(w?.content as Record<string, Record<string, string>>)?.["about"]?.["body"] ?? ""}
                  onChange={(e) => setAbout((p) => ({ ...p, body: e.target.value }))}
                  placeholder="We are passionate about fitness..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">SEO Meta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Page Title</label>
                <Input
                  defaultValue={w?.seoMeta.title ?? ""}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Iron Forge Fitness — Mumbai's Best Gym"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  defaultValue={w?.seoMeta.description ?? ""}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  placeholder="Expert trainers, modern equipment, and flexible plans..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSaveContent} disabled={updateWebsite.isPending}>
              {updateWebsite.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <p className="text-xs text-muted-foreground self-center">Plans and trainers are pulled live from your CRM data.</p>
          </div>
        </div>
      )}

      {/* Design tab */}
      {activeTab === "design" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose a template. All templates pull plans, trainers, and content from your CRM — no rebuilds needed.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => {
              const active = (w?.templateId ?? "modern") === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => updateWebsite.mutate({ templateId: tpl.id })}
                  className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
                    active ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                  }`}
                >
                  <div className={`h-2 w-8 rounded mb-3 ${tpl.id === "bold" ? "bg-yellow-400" : tpl.id === "classic" ? "bg-gray-700" : "bg-indigo-600"}`} />
                  <p className="font-semibold">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tpl.desc}</p>
                  {active && <p className="text-xs text-primary mt-2 font-medium">✓ Active</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Domain tab */}
      {activeTab === "domain" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Free Subdomain</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">Your site is live at:</p>
              <code className="bg-muted rounded px-2 py-1 text-sm mt-1 block">
                {data?.gym.slug}.grwfit.com
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Custom Domain</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {w?.customDomain ? (
                <div>
                  <p className="text-sm">Connected: <strong>{w.customDomain}</strong></p>
                  {(() => {
                    const ssl = SSL_CONFIG[w.sslStatus as keyof typeof SSL_CONFIG] ?? SSL_CONFIG.pending;
                    const SslIcon = ssl.icon;
                    return <p className={`text-xs mt-1 flex items-center gap-1 ${ssl.color}`}><SslIcon className="h-3.5 w-3.5" />{ssl.label}</p>;
                  })()}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="www.yourgym.com"
                    className="flex-1"
                  />
                  <Button onClick={handleConnectDomain} disabled={connectDomain.isPending || !domain.trim()}>
                    Connect
                  </Button>
                </div>
              )}

              {domainResult && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">DNS Setup Instructions</p>
                  {domainResult.instructions.map((line, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-mono">{line}</p>
                  ))}
                  <p className="text-xs text-muted-foreground">SSL will activate automatically within 24 hours after DNS propagates.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics tab */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold">{totalViews.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Page Views (30d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">Trial Bookings (30d)</p>
              </CardContent>
            </Card>
          </div>
          {(analytics?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Analytics will appear once your site is published and receiving visitors.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
