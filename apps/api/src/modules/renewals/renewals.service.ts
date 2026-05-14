import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { WhatsAppService } from "../auth/services/whatsapp.service";
import { RedisService } from "../../common/services/redis.service";
import type {
  RenewalsDashboardQueryDto, SendReminderDto, BulkReminderDto,
  MarkContactedDto, UpdateRenewalConfigDto, UpsertTemplateDto,
} from "./dto/renewals.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { differenceInDays, addDays, format } from "date-fns";

export const REMINDER_QUEUE = "renewal-reminder";

// ── Bucket definitions ────────────────────────────────────────────────────────

const BUCKET_RANGES: Record<string, { minDays: number; maxDays: number }> = {
  today:       { minDays:  0, maxDays:  0 },
  week:        { minDays:  1, maxDays:  7 },
  month:       { minDays:  8, maxDays: 30 },
  expired_7:   { minDays: -7,  maxDays: -1 },
  expired_30:  { minDays: -30, maxDays: -8 },
  expired_90:  { minDays: -90, maxDays: -31 },
  expired_old: { minDays: -9999, maxDays: -91 },
};

export interface RenewalMember {
  id: string;
  name: string;
  phone: string;
  expiresAt: string | null;
  daysToExpiry: number | null;
  status: string;
  planName: string | null;
  pricePaise: number | null;
  lastContactedAt: string | null;
  bucket: string;
  branchId: string | null;
  assignedTrainerId: string | null;
}

export interface DashboardSummary {
  today:       { count: number; revenuePaise: number };
  week:        { count: number; revenuePaise: number };
  month:       { count: number; revenuePaise: number };
  expired_7:   { count: number; revenuePaise: number };
  expired_30:  { count: number; revenuePaise: number };
  expired_90:  { count: number; revenuePaise: number };
  expired_old: { count: number; revenuePaise: number };
}

@Injectable()
export class RenewalsService {
  private readonly logger = new Logger(RenewalsService.name);

  constructor(
    private readonly whatsApp: WhatsAppService,
    private readonly redis: RedisService,
    @InjectQueue(REMINDER_QUEUE) private readonly reminderQueue: Queue,
  ) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  async getDashboard(gymId: string, query: RenewalsDashboardQueryDto) {
    const cacheKey = `renewals_summary:${gymId}`;
    const cached = await this.redis.get(cacheKey);

    let summary: DashboardSummary;
    if (cached) {
      summary = JSON.parse(cached) as DashboardSummary;
    } else {
      summary = await this.computeSummary(gymId);
      await this.redis.set(cacheKey, JSON.stringify(summary), 300); // 5 min TTL
    }

    const members = query.bucket
      ? await this.getMembersInBucket(gymId, query.bucket, query)
      : await this.getMembersInBucket(gymId, "week", query); // default to week bucket

    return { summary, members };
  }

  private async computeSummary(gymId: string): Promise<DashboardSummary> {
    const prisma = getPrismaClient();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Single raw query to bucket and aggregate — avoids N+1
    const rows = await prisma.$queryRaw<Array<{
      bucket: string;
      count: bigint;
      revenue: bigint;
    }>>`
      SELECT
        CASE
          WHEN date_trunc('day', expires_at) = ${now}                                  THEN 'today'
          WHEN expires_at > ${now} AND expires_at <= ${addDays(now, 7)}               THEN 'week'
          WHEN expires_at > ${addDays(now, 7)} AND expires_at <= ${addDays(now, 30)} THEN 'month'
          WHEN expires_at < ${now} AND expires_at >= ${addDays(now, -7)}              THEN 'expired_7'
          WHEN expires_at < ${addDays(now, -7)} AND expires_at >= ${addDays(now, -30)} THEN 'expired_30'
          WHEN expires_at < ${addDays(now, -30)} AND expires_at >= ${addDays(now, -90)} THEN 'expired_90'
          WHEN expires_at < ${addDays(now, -90)}                                       THEN 'expired_old'
          ELSE 'other'
        END AS bucket,
        COUNT(m.id) AS count,
        COALESCE(SUM(p.price_paise), 0) AS revenue
      FROM members m
      LEFT JOIN membership_plans p ON p.id = m.current_plan_id
      WHERE m.gym_id    = ${gymId}::uuid
        AND m.deleted_at IS NULL
        AND m.status    IN ('active', 'trial', 'expired')
        AND m.expires_at IS NOT NULL
      GROUP BY 1
    `;

    const summary: DashboardSummary = {
      today:       { count: 0, revenuePaise: 0 },
      week:        { count: 0, revenuePaise: 0 },
      month:       { count: 0, revenuePaise: 0 },
      expired_7:   { count: 0, revenuePaise: 0 },
      expired_30:  { count: 0, revenuePaise: 0 },
      expired_90:  { count: 0, revenuePaise: 0 },
      expired_old: { count: 0, revenuePaise: 0 },
    };

    for (const row of rows) {
      const key = row.bucket as keyof DashboardSummary;
      if (key in summary) {
        summary[key] = { count: Number(row.count), revenuePaise: Number(row.revenue) };
      }
    }

    return summary;
  }

  private async getMembersInBucket(
    gymId: string,
    bucket: string,
    query: RenewalsDashboardQueryDto,
  ): Promise<RenewalMember[]> {
    const prisma = getPrismaClient();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const range = BUCKET_RANGES[bucket];
    if (!range) throw new BadRequestException(`Unknown bucket: ${bucket}`);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const fromDate = addDays(now, range.minDays);
    const toDate   = addDays(now, range.maxDays + 1); // +1 to include max day

    const where: Prisma.MemberWhereInput = {
      gymId,
      deletedAt: null,
      status: { in: ["active", "trial", "expired"] },
      expiresAt: { gte: fromDate, lt: toDate },
      ...(query.branchId   && { branchId: query.branchId }),
      ...(query.trainerId  && { assignedTrainerId: query.trainerId }),
      ...(query.planId     && { currentPlanId: query.planId }),
    };

    const members = await prisma.member.findMany({
      where,
      orderBy: { expiresAt: "asc" },
      skip, take: limit,
      include: {
        renewalFollowUps: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, outcome: true },
        },
      },
    });

    // Batch-fetch plan names for members that have a currentPlanId
    const planIds = [...new Set(members.map((m) => m.currentPlanId).filter(Boolean))] as string[];
    const plans = planIds.length
      ? await prisma.membershipPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true, pricePaise: true } })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      expiresAt: m.expiresAt?.toISOString() ?? null,
      daysToExpiry: m.expiresAt ? differenceInDays(m.expiresAt, now) : null,
      status: m.status,
      planName: m.currentPlanId ? (planMap.get(m.currentPlanId)?.name ?? null) : null,
      pricePaise: m.currentPlanId ? (planMap.get(m.currentPlanId)?.pricePaise ?? null) : null,
      lastContactedAt: m.renewalFollowUps[0]?.createdAt.toISOString() ?? null,
      bucket,
      branchId: m.branchId,
      assignedTrainerId: m.assignedTrainerId,
    }));
  }

  // ── SEND REMINDER ─────────────────────────────────────────────────────────

  async sendReminder(gymId: string, dto: SendReminderDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();

    const member = await prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException("Member not found");
    if (member.doNotMessage) throw new BadRequestException("Member has opted out of messages");

    const memberPlan = member.currentPlanId
      ? await prisma.membershipPlan.findUnique({ where: { id: member.currentPlanId }, select: { name: true, pricePaise: true } })
      : null;

    const triggerType = dto.triggerType ?? this.detectTriggerType(member.expiresAt);
    const config = await prisma.gymRenewalConfig.findUnique({
      where: { gymId_triggerType: { gymId, triggerType } },
      include: { template: true },
    });

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { name: true } });

    const message = this.buildMessage(
      member.name, gym?.name ?? "", member.expiresAt, memberPlan?.pricePaise ?? null,
      triggerType, config?.includeOffer ?? false, config?.offerPct ?? 10,
    );

    const result = await this.whatsApp.sendOtp(member.phone, message);

    await prisma.renewalReminder.create({
      data: {
        gymId, memberId: dto.memberId,
        triggerType, templateId: config?.templateId ?? null,
        channel: "whatsapp",
        status: result.success ? "sent" : "failed",
        errorMsg: null,
      },
    });

    // Create follow-up record
    await prisma.renewalFollowUp.create({
      data: {
        gymId, memberId: dto.memberId,
        staffId: req.userId!,
        outcome: "contacted",
        notes: `Reminder sent via WhatsApp (${triggerType})`,
      },
    });

    return { sent: result.success, channel: "whatsapp", triggerType };
  }

  // ── BULK REMINDER ─────────────────────────────────────────────────────────

  async sendBulkReminders(gymId: string, dto: BulkReminderDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    let memberIds: string[];

    if (dto.memberIds?.length) {
      memberIds = dto.memberIds;
    } else {
      const bucket = dto.bucket ?? "week";
      const members = await this.getMembersInBucket(gymId, bucket, { limit: 500, page: 1 });
      memberIds = members.filter((m) => !m.lastContactedAt).map((m) => m.id);
    }

    if (!memberIds.length) return { queued: 0 };

    // Enqueue all as a single BullMQ job — return count immediately
    await this.reminderQueue.add(
      { gymId, memberIds, staffId: req.userId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );

    this.logger.log(`Queued bulk reminder: ${memberIds.length} members for gym ${gymId}`);
    return { queued: memberIds.length };
  }

  // ── MARK CONTACTED ────────────────────────────────────────────────────────

  async markContacted(gymId: string, dto: MarkContactedDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({ where: { id: dto.memberId, gymId, deletedAt: null } });
    if (!member) throw new NotFoundException("Member not found");

    const followUp = await prisma.renewalFollowUp.create({
      data: {
        gymId,
        memberId: dto.memberId,
        staffId: req.userId!,
        outcome: dto.outcome,
        notes: dto.notes ?? null,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
      },
    });

    // Invalidate dashboard cache
    await this.redis.del(`renewals_summary:${gymId}`);

    return followUp;
  }

  // ── FOLLOW-UP PIPELINE ────────────────────────────────────────────────────

  async getFollowUps(gymId: string, page = 1, limit = 50) {
    const prisma = getPrismaClient();
    const skip = (page - 1) * limit;
    const now = new Date();

    // Members who were contacted (reminder sent or follow-up logged) but haven't converted
    const followUps = await prisma.renewalFollowUp.findMany({
      where: {
        gymId,
        outcome: { in: ["contacted", "interested", "no_answer"] },
        member: { status: { in: ["active", "trial", "expired"] }, deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        member: {
          select: { id: true, name: true, phone: true, expiresAt: true, status: true },
        },
      },
      distinct: ["memberId"],
    });

    return followUps.map((f) => ({
      ...f,
      daysInFollowUp: differenceInDays(now, f.createdAt),
    }));
  }

  // ── REMINDER ENGINE (called by cron) ─────────────────────────────────────

  async runReminderEngine(gymId?: string) {
    const prisma = getPrismaClient();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Load all active configs
    const configs = await prisma.gymRenewalConfig.findMany({
      where: { isActive: true, ...(gymId ? { gymId } : {}) },
      include: { gym: { select: { id: true, name: true } } },
    });

    const TRIGGER_OFFSETS: Record<string, number> = {
      days_7_before: -7,
      days_3_before: -3,
      days_1_before: -1,
      on_expiry:      0,
      days_7_after:   7,
      days_30_after: 30,
    };

    let totalQueued = 0;
    const processedGyms = new Set<string>();

    for (const config of configs) {
      const offset = TRIGGER_OFFSETS[config.triggerType];
      if (offset === undefined) continue;

      const targetDate = addDays(now, offset);
      const gymId = config.gymId;

      // Find members whose expiry matches this trigger window
      const members = await prisma.member.findMany({
        where: {
          gymId,
          deletedAt: null,
          status: { in: ["active", "trial", "expired"] },
          doNotMessage: false,
          expiresAt: {
            gte: targetDate,
            lt: addDays(targetDate, 1),
          },
        },
        select: { id: true, name: true, phone: true, expiresAt: true, createdBy: true },
      });

      if (!members.length) continue;

      // Filter: skip if same reminder already sent in last 24h (Redis dedup)
      const eligible: string[] = [];
      for (const m of members) {
        const dedupKey = `reminder_sent:${gymId}:${m.id}:${config.triggerType}`;
        const already = await this.redis.get(dedupKey);
        if (!already) eligible.push(m.id);
      }

      if (!eligible.length) continue;

      // Queue BullMQ job for this batch
      await this.reminderQueue.add(
        {
          gymId,
          memberIds: eligible,
          triggerType: config.triggerType,
          gymName: config.gym.name,
          templateId: config.templateId,
          includeOffer: config.includeOffer,
          offerPct: config.offerPct,
        },
        { attempts: 3, removeOnComplete: 100 },
      );

      // Mark dormant if days_30_after
      if (config.triggerType === "days_30_after") {
        await prisma.member.updateMany({
          where: { id: { in: eligible }, gymId },
          data: { status: "expired" }, // already expired; mark in system
        });
      }

      totalQueued += eligible.length;
      processedGyms.add(gymId);
    }

    if (totalQueued > 0) {
      this.logger.log(`Reminder engine: queued ${totalQueued} reminders across ${processedGyms.size} gyms`);
    }

    return { queued: totalQueued };
  }

  // ── CONFIG & TEMPLATES ────────────────────────────────────────────────────

  async getRenewalConfigs(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.gymRenewalConfig.findMany({
      where: { gymId },
      include: { template: { select: { id: true, name: true, body: true } } },
      orderBy: { triggerType: "asc" },
    });
  }

  async updateRenewalConfig(gymId: string, triggerType: string, dto: UpdateRenewalConfigDto) {
    const prisma = getPrismaClient();
    return prisma.gymRenewalConfig.upsert({
      where: { gymId_triggerType: { gymId, triggerType } },
      create: { gymId, triggerType, ...dto },
      update: dto,
    });
  }

  async listTemplates(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.whatsappTemplate.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsertTemplate(gymId: string, dto: UpsertTemplateDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    return prisma.whatsappTemplate.create({
      data: {
        gymId,
        name: dto.name,
        body: dto.body,
        metaTemplateId: dto.metaTemplateId ?? null,
        variables: dto.variables ?? [],
        category: dto.category ?? "UTILITY",
        status: "pending",
      },
    });
  }

  // ── EXPORT CSV ────────────────────────────────────────────────────────────

  async exportCsv(gymId: string, bucket: string, query: RenewalsDashboardQueryDto) {
    const members = await this.getMembersInBucket(gymId, bucket, { ...query, limit: 10000, page: 1 });
    const header = "Name,Phone,Plan,Expires At,Days,Status,Potential Revenue (₹),Last Contacted";
    const rows = members.map((m) =>
      [
        `"${m.name}"`, m.phone, `"${m.planName ?? "—"}"`,
        m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("en-IN") : "—",
        m.daysToExpiry ?? "—", m.status,
        m.pricePaise ? (m.pricePaise / 100).toFixed(2) : "—",
        m.lastContactedAt ? new Date(m.lastContactedAt).toLocaleDateString("en-IN") : "Never",
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private detectTriggerType(expiresAt: Date | null): string {
    if (!expiresAt) return "on_expiry";
    const days = differenceInDays(expiresAt, new Date());
    if (days >= 7) return "days_7_before";
    if (days >= 3) return "days_3_before";
    if (days >= 1) return "days_1_before";
    if (days === 0) return "on_expiry";
    if (days >= -7) return "days_7_after";
    return "days_30_after";
  }

  private buildMessage(
    memberName: string, gymName: string, expiresAt: Date | null,
    pricePaise: number | null, triggerType: string,
    includeOffer: boolean, offerPct: number,
  ): string {
    const first = memberName.split(" ")[0]!;
    const expStr = expiresAt ? format(expiresAt, "dd MMM yyyy") : "soon";
    const price = pricePaise ? `₹${(pricePaise / 100).toLocaleString("en-IN")}` : "";
    const offerMsg = includeOffer && pricePaise
      ? ` 🎉 Renew today at ${offerPct}% off — only ${`₹${((pricePaise * (100 - offerPct)) / 10000).toFixed(0)}`}!`
      : "";

    const templates: Record<string, string> = {
      days_7_before: `Hi ${first}, your membership at ${gymName} expires in 7 days on ${expStr}. Renew now to keep your streak! 💪${offerMsg}`,
      days_3_before: `Hi ${first}, only 3 days left at ${gymName} (expires ${expStr}).${offerMsg || ` Renew now for ${price}!`}`,
      days_1_before: `Hi ${first}, your membership at ${gymName} expires TOMORROW (${expStr})! Renew now to avoid losing access. ⚡`,
      on_expiry:     `Hi ${first}, your membership at ${gymName} has expired today. We miss you! Come back and renew.${offerMsg}`,
      days_7_after:  `Hi ${first}, it's been a week since your ${gymName} membership expired. Last chance to rejoin at your old rate!`,
      days_30_after: `Hi ${first}, your ${gymName} membership expired 30 days ago. Reply YES to rejoin our community! 🏋️`,
    };

    return templates[triggerType] ?? templates["on_expiry"]!;
  }
}
