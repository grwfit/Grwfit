import { Injectable, Logger, ConflictException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { addDays } from "date-fns";
import type { AppConfig } from "../../config/configuration";
import type {
  GymSignupDto, Step1GymProfileDto, Step2PlansDto, Step3StaffDto, ConvertTrialDto,
} from "./dto/onboarding.dto";

const PLAN_TEMPLATES = [
  { name: "Monthly",    pricePaise: 150000, durationDays: 30  },
  { name: "Quarterly",  pricePaise: 400000, durationDays: 90  },
  { name: "Annual",     pricePaise: 1200000, durationDays: 365 },
];

const PLAN_MRR: Record<string, number> = {
  basic: 99900, standard: 199900, pro: 399900,
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly prisma = getPrismaClient();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  // ── Public signup ─────────────────────────────────────────────────────────

  async signupGym(dto: GymSignupDto) {
    const phone = dto.phone.startsWith("+91") ? dto.phone : `+91${dto.phone.replace(/^0/, "")}`;

    // Check phone not already an owner
    const existing = await this.prisma.staffUser.findFirst({ where: { phone, role: "owner" } });
    if (existing) throw new ConflictException("An account with this phone number already exists");

    const slug = this.generateSlug(dto.gymName);
    const trialEndsAt = addDays(new Date(), 14);

    const [gym, owner] = await this.prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({
        data: {
          name: dto.gymName,
          slug,
          subdomain: slug,
          phone,
          planTier: "trial",
          status: "trial",
          trialEndsAt,
          address: dto.city ? { city: dto.city } : {},
        },
      });

      const owner = await tx.staffUser.create({
        data: {
          gymId: gym.id,
          phone,
          name: dto.ownerName,
          email: dto.email ?? null,
          role: "owner",
          isActive: true,
        },
      });

      // Create default membership plans
      await tx.membershipPlan.createMany({
        data: PLAN_TEMPLATES.map((p) => ({ gymId: gym.id, ...p })),
      });

      // Create platform subscription (trial)
      await tx.platformSubscription.create({
        data: { gymId: gym.id, planTier: "trial", mrrPaise: 0, status: "trial", trialEndsAt },
      });

      // Init onboarding progress
      await tx.onboardingProgress.create({
        data: { gymId: gym.id, currentStep: 1, completedSteps: [], stepData: {} },
      });

      return [gym, owner] as const;
    });

    // Issue access token
    const secret = this.config.get("jwt.accessSecret", { infer: true });
    const accessToken = this.jwtService.sign(
      { sub: owner.id, gymId: gym.id, role: "owner", type: "staff" },
      { secret, expiresIn: "15m" },
    );

    this.logger.log(`New gym signed up: ${gym.name} (${gym.slug})`);
    return { gym, owner, accessToken, trialEndsAt };
  }

  // ── Wizard progress ───────────────────────────────────────────────────────

  async getProgress(gymId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({ where: { gymId } });
    if (!progress) return { currentStep: 1, completedSteps: [], stepData: {}, completedAt: null };

    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true, slug: true, trialEndsAt: true, planTier: true, status: true },
    });

    const daysLeft = gym?.trialEndsAt
      ? Math.max(0, Math.ceil((gym.trialEndsAt.getTime() - Date.now()) / 86400000))
      : null;

    return { ...progress, gym, daysLeft };
  }

  async saveStep(gymId: string, step: number, data: Record<string, unknown>) {
    const progress = await this.prisma.onboardingProgress.findUnique({ where: { gymId } });
    const completed = new Set((progress?.completedSteps as number[]) ?? []);
    completed.add(step);

    return this.prisma.onboardingProgress.upsert({
      where: { gymId },
      create: {
        gymId,
        currentStep: Math.min(step + 1, 5),
        completedSteps: Array.from(completed),
        stepData: { [step]: data } as never,
      },
      update: {
        currentStep: Math.max(progress?.currentStep ?? 1, Math.min(step + 1, 5)),
        completedSteps: Array.from(completed),
        stepData: { ...((progress?.stepData as object) ?? {}), [step]: data } as never,
        ...(completed.size >= 5 && { completedAt: new Date() }),
      },
    });
  }

  // ── Step 1: Gym Profile ───────────────────────────────────────────────────

  async completeStep1(gymId: string, dto: Step1GymProfileDto) {
    await this.prisma.gym.update({
      where: { id: gymId },
      data: {
        ...(dto.logoUrl && { logoUrl: dto.logoUrl }),
        ...(dto.address ? { address: dto.address as Prisma.InputJsonValue } : {}),
        ...(dto.gstNo && { gstNo: dto.gstNo }),
        ...(dto.operatingHours ? { operatingHours: dto.operatingHours as Prisma.InputJsonValue } : {}),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
    });
    return this.saveStep(gymId, 1, dto as Record<string, unknown>);
  }

  // ── Step 2: Plans ─────────────────────────────────────────────────────────

  async completeStep2(gymId: string, dto: Step2PlansDto) {
    // Replace existing plans with what owner configured
    await this.prisma.membershipPlan.updateMany({ where: { gymId }, data: { isActive: false } });
    await this.prisma.membershipPlan.createMany({
      data: dto.plans.map((p) => ({ gymId, ...p })),
    });
    return this.saveStep(gymId, 2, { planCount: dto.plans.length });
  }

  // ── Step 3: Add Staff ─────────────────────────────────────────────────────

  async completeStep3(gymId: string, dto: Step3StaffDto) {
    const phones = dto.trainers.map((t) =>
      t.phone.startsWith("+91") ? t.phone : `+91${t.phone}`,
    );
    const existingStaff = await this.prisma.staffUser.findMany({
      where: { gymId, phone: { in: phones } },
      select: { phone: true },
    });
    const existingPhones = new Set(existingStaff.map((s) => s.phone));

    const newTrainers = dto.trainers
      .map((t) => ({
        ...t,
        phone: t.phone.startsWith("+91") ? t.phone : `+91${t.phone}`,
      }))
      .filter((t) => !existingPhones.has(t.phone));

    if (newTrainers.length > 0) {
      await this.prisma.staffUser.createMany({
        data: newTrainers.map((t) => ({
          gymId,
          phone: t.phone,
          name: t.name,
          role: "trainer" as const,
          commissionPct: t.commissionPct ?? null,
        })),
      });
    }

    return this.saveStep(gymId, 3, { trainerCount: dto.trainers.length });
  }

  // ── Step 4: Import Members (skip — handled by existing members import) ────

  async skipStep4(gymId: string) {
    return this.saveStep(gymId, 4, { skipped: true });
  }

  // ── Step 5: First Check-in demo ───────────────────────────────────────────

  async completeStep5(gymId: string) {
    return this.saveStep(gymId, 5, { firstCheckinDone: true });
  }

  // ── Trial → Paid conversion ───────────────────────────────────────────────

  async convertTrial(gymId: string, dto: ConvertTrialDto) {
    const mrrPaise = PLAN_MRR[dto.planTier] ?? PLAN_MRR["basic"]!;

    await this.prisma.$transaction([
      this.prisma.gym.update({
        where: { id: gymId },
        data: { planTier: dto.planTier as never, status: "active", trialEndsAt: null },
      }),
      this.prisma.platformSubscription.upsert({
        where: { gymId },
        create: {
          gymId,
          planTier: dto.planTier,
          mrrPaise,
          status: "active",
          razorpaySubscriptionId: dto.razorpayPaymentId ?? null,
          convertedAt: new Date(),
        },
        update: {
          planTier: dto.planTier,
          mrrPaise,
          status: "active",
          razorpaySubscriptionId: dto.razorpayPaymentId ?? null,
          convertedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Gym ${gymId} converted to ${dto.planTier} plan`);
    return { success: true, planTier: dto.planTier, mrrPaise };
  }

  // ── Trial expiry cron ─────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendTrialReminders() {
    const today = new Date();

    // Day 7, 12, 14 reminders
    for (const daysLeft of [7, 2, 0]) {
      const targetDate = addDays(today, daysLeft);
      const startOfTarget = new Date(targetDate.toDateString());
      const endOfTarget = addDays(startOfTarget, 1);

      const gyms = await this.prisma.gym.findMany({
        where: {
          status: "trial",
          trialEndsAt: { gte: startOfTarget, lt: endOfTarget },
        },
        select: { id: true, name: true, phone: true },
      });

      for (const gym of gyms) {
        this.logger.log(`Trial reminder (${daysLeft}d left) for gym ${gym.name}`);
        // WhatsApp nudge would fire here via WhatsAppModuleService
      }
    }

    // Day 14 expired: downgrade to read-only
    const expired = await this.prisma.gym.findMany({
      where: { status: "trial", trialEndsAt: { lt: today } },
    });

    if (expired.length) {
      await this.prisma.gym.updateMany({
        where: { id: { in: expired.map((g) => g.id) } },
        data: { status: "suspended" },
      });
      this.logger.log(`Suspended ${expired.length} expired trial gyms`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30);
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
