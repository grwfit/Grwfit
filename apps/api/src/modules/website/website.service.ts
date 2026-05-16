import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import type { AppConfig } from "../../config/configuration";
import type {
  UpdateWebsiteContentDto, ConnectDomainDto, TrialBookingDto,
} from "./dto/website.dto";

// Default content template so a new gym site looks good out-of-the-box
const DEFAULT_CONTENT = {
  hero: {
    headline: "Transform Your Body. Transform Your Life.",
    subheadline: "Join us for world-class training and a community that keeps you accountable.",
    ctaText: "Book a Free Trial",
    backgroundImage: null,
  },
  about: {
    title: "About Us",
    body: "We are passionate about fitness and committed to helping every member achieve their goals.",
    features: ["Expert Trainers", "Modern Equipment", "Flexible Timings", "Proven Results"],
  },
  contact: {
    showMap: true,
    hours: "Mon–Sat: 6am–10pm, Sun: 7am–8pm",
  },
};

const DEFAULT_SEO = {
  title: "Join Our Gym",
  description: "World-class fitness facility with expert trainers, modern equipment, and flexible memberships.",
  ogImage: null,
};

@Injectable()
export class WebsiteService {
  private readonly logger = new Logger(WebsiteService.name);
  private readonly prisma = getPrismaClient();

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  // ── Get or create website config ─────────────────────────────────────────

  async getWebsite(gymId: string) {
    let website = await this.prisma.website.findUnique({ where: { gymId } });

    if (!website) {
      const gym = await this.prisma.gym.findUnique({
        where: { id: gymId },
        select: { slug: true, name: true },
      });
      website = await this.prisma.website.create({
        data: {
          gymId,
          templateId: "modern",
          content: DEFAULT_CONTENT,
          seoMeta: { ...DEFAULT_SEO, title: `${gym?.name ?? "Our Gym"} — Fitness Centre` },
        },
      });
    }

    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        slug: true, name: true, phone: true, address: true,
        logoUrl: true, timezone: true,
      },
    });

    const plans = await this.prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      select: { id: true, name: true, pricePaise: true, durationDays: true },
      orderBy: { pricePaise: "asc" },
    });

    const trainers = await this.prisma.staffUser.findMany({
      where: { gymId, role: "trainer", isActive: true },
      select: { id: true, name: true },
      take: 10,
    });

    return { website, gym, plans, trainers };
  }

  // ── Update content ────────────────────────────────────────────────────────

  async updateWebsite(gymId: string, dto: UpdateWebsiteContentDto) {
    const existing = await this.prisma.website.findUnique({ where: { gymId } });

    if (!existing) {
      return this.prisma.website.create({
        data: {
          gymId,
          templateId: dto.templateId ?? "modern",
          content: (dto.content ?? DEFAULT_CONTENT) as Prisma.InputJsonValue,
          seoMeta: (dto.seoMeta ?? DEFAULT_SEO) as Prisma.InputJsonValue,
        },
      });
    }

    return this.prisma.website.update({
      where: { gymId },
      data: {
        ...(dto.templateId ? { templateId: dto.templateId } : {}),
        ...(dto.content ? { content: dto.content as Prisma.InputJsonValue } : {}),
        ...(dto.seoMeta ? { seoMeta: dto.seoMeta as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async publishWebsite(gymId: string) {
    return this.prisma.website.update({
      where: { gymId },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  async unpublishWebsite(gymId: string) {
    return this.prisma.website.update({ where: { gymId }, data: { isPublished: false } });
  }

  // ── Custom domain ─────────────────────────────────────────────────────────

  async connectDomain(gymId: string, dto: ConnectDomainDto) {
    const cloudflareToken = process.env["CLOUDFLARE_API_TOKEN"];
    const cfZoneId = process.env["CLOUDFLARE_ZONE_ID"];

    let cloudflareSiteId: string | null = null;

    if (cfZoneId && cloudflareToken) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cloudflareToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              hostname: dto.domain,
              ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
            }),
          },
        );
        const data = (await res.json()) as { result?: { id?: string } };
        cloudflareSiteId = data.result?.id ?? null;
      } catch (err) {
        this.logger.warn(`Cloudflare domain setup failed: ${err}`);
      }
    }

    await this.prisma.website.update({
      where: { gymId },
      data: {
        customDomain: dto.domain,
        cloudflareSiteId,
        sslStatus: "pending",
      },
    });

    // Also update gym.customDomain
    await this.prisma.gym.update({ where: { id: gymId }, data: { customDomain: dto.domain } });

    return {
      domain: dto.domain,
      cnameTarget: process.env["CLOUDFLARE_CNAME_TARGET"] ?? `${process.env["NEXT_PUBLIC_SITES_DOMAIN"] ?? "sites.grwfit.com"}`,
      sslStatus: "pending",
      instructions: [
        `Add a CNAME record in your DNS:`,
        `  Host: ${dto.domain.startsWith("www.") ? dto.domain : `www.${dto.domain}`}`,
        `  Points to: ${process.env["NEXT_PUBLIC_SITES_DOMAIN"] ?? "sites.grwfit.com"}`,
        `SSL will be provisioned automatically after DNS propagates (up to 24 hours).`,
      ],
    };
  }

  async checkDomainSsl(gymId: string) {
    const website = await this.prisma.website.findUnique({ where: { gymId } });
    if (!website?.cloudflareSiteId) return { sslStatus: "pending" };

    const cfZoneId = process.env["CLOUDFLARE_ZONE_ID"];
    const cfToken = process.env["CLOUDFLARE_API_TOKEN"];

    if (cfZoneId && cfToken) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${website.cloudflareSiteId}`,
          { headers: { Authorization: `Bearer ${cfToken}` } },
        );
        const data = (await res.json()) as { result?: { ssl?: { status?: string } } };
        const active = data.result?.ssl?.status === "active";
        if (active) {
          await this.prisma.website.update({ where: { gymId }, data: { sslStatus: "active" } });
        }
        return { sslStatus: active ? "active" : "pending" };
      } catch {
        return { sslStatus: website.sslStatus };
      }
    }

    return { sslStatus: website.sslStatus };
  }

  // ── Public: fetch gym by domain (used by apps/sites) ─────────────────────

  async getPublicGymByDomain(domain: string) {
    // Look up by custom domain or subdomain (slug.grwfit.com)
    const slug = domain.replace(/\.grwfit\.com$/, "").replace(/^www\./, "");

    const gym = await this.prisma.gym.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          { subdomain: slug },
          { slug },
        ],
        status: { in: ["active", "trial"] },
      },
      select: {
        id: true, name: true, slug: true, subdomain: true,
        phone: true, address: true, logoUrl: true,
        website: true,
      },
    });

    if (!gym) return null;

    const [plans, trainers] = await this.prisma.$transaction([
      this.prisma.membershipPlan.findMany({
        where: { gymId: gym.id, isActive: true },
        select: { id: true, name: true, pricePaise: true, durationDays: true },
        orderBy: { pricePaise: "asc" },
      }),
      this.prisma.staffUser.findMany({
        where: { gymId: gym.id, role: "trainer", isActive: true },
        select: { id: true, name: true },
        take: 6,
      }),
    ]);

    return { gym, plans, trainers };
  }

  // ── Lead capture (trial booking from website) ─────────────────────────────

  async submitTrialBooking(gymId: string, dto: TrialBookingDto) {
    const phone = dto.phone.startsWith("+91") ? dto.phone : `+91${dto.phone.replace(/^0/, "")}`;

    // Upsert lead (don't error if phone already exists)
    const existing = await this.prisma.lead.findFirst({ where: { gymId, phone } });

    if (!existing) {
      await this.ensureDefaultStages(gymId);
      const defaultStage = await this.prisma.leadStage.findFirst({
        where: { gymId, isDefault: true },
      });
      await this.prisma.lead.create({
        data: {
          gymId,
          phone,
          name: dto.name,
          email: dto.email ?? null,
          source: "website",
          sourceDetails: { form: "trial_booking" },
          stageId: defaultStage?.id ?? null,
          status: "open",
        },
      });
    }

    // Track analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.websiteAnalytics.upsert({
      where: { gymId_date: { gymId, date: today } },
      create: { gymId, date: today, leadsGenerated: 1 },
      update: { leadsGenerated: { increment: 1 } },
    });

    return { success: true };
  }

  async submitTrialBookingBySlug(dto: TrialBookingDto) {
    if (!dto.gymSlug) return { success: false, error: "gymSlug required" };
    const gym = await this.prisma.gym.findFirst({
      where: { OR: [{ slug: dto.gymSlug }, { subdomain: dto.gymSlug }] },
      select: { id: true },
    });
    if (!gym) return { success: false, error: "Gym not found" };
    return this.submitTrialBooking(gym.id, dto);
  }

  async trackPageView(gymId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.websiteAnalytics.upsert({
      where: { gymId_date: { gymId, date: today } },
      create: { gymId, date: today, views: 1 },
      update: { views: { increment: 1 } },
    });
  }

  async getAnalytics(gymId: string, days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.websiteAnalytics.findMany({
      where: { gymId, date: { gte: from } },
      orderBy: { date: "asc" },
    });
  }

  private async ensureDefaultStages(gymId: string) {
    const count = await this.prisma.leadStage.count({ where: { gymId } });
    if (count > 0) return;
    const defaults = [
      { name: "New", position: 0, color: "#6366f1", isDefault: true },
      { name: "Trial Booked", position: 1, color: "#f59e0b", isDefault: false },
      { name: "Converted", position: 2, color: "#10b981", isDefault: false },
      { name: "Lost", position: 3, color: "#ef4444", isDefault: false },
    ];
    await this.prisma.leadStage.createMany({
      data: defaults.map((s) => ({ gymId, ...s })),
    });
  }
}
