import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma, TriggerEvent } from "@grwfit/db";
import { BspFactory } from "./bsp/bsp.factory";
import type {
  CreateTemplateDto, UpdateTemplateDto, TestTemplateSendDto,
  UpsertTriggerRuleDto, ListMessagesQueryDto,
} from "./dto/whatsapp.dto";

export const BROADCAST_QUEUE = "whatsapp-broadcast";
export const TRIGGER_QUEUE = "whatsapp-trigger";

// BSP rate limit: 80 messages/second
const BATCH_SIZE = 80;

@Injectable()
export class WhatsAppModuleService {
  private readonly logger = new Logger(WhatsAppModuleService.name);
  private readonly prisma = getPrismaClient();

  constructor(
    private readonly bspFactory: BspFactory,
    @InjectQueue(BROADCAST_QUEUE) private readonly broadcastQueue: Queue,
    @InjectQueue(TRIGGER_QUEUE) private readonly triggerQueue: Queue,
  ) {}

  // ── Templates ─────────────────────────────────────────────────────────────

  async listTemplates(gymId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTemplate(gymId: string, dto: CreateTemplateDto) {
    return this.prisma.whatsappTemplate.create({
      data: {
        gymId,
        name: dto.name,
        metaTemplateId: dto.metaTemplateId,
        body: dto.body,
        variables: dto.variables,
        category: dto.category ?? "UTILITY",
        status: "pending",
      },
    });
  }

  async updateTemplate(gymId: string, templateId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: { id: templateId, gymId },
    });
    if (!template) throw new NotFoundException("Template not found");

    return this.prisma.whatsappTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.metaTemplateId !== undefined && { metaTemplateId: dto.metaTemplateId }),
        ...(dto.body && { body: dto.body }),
        ...(dto.variables && { variables: dto.variables }),
        ...(dto.category && { category: dto.category }),
        status: "pending",
      },
    });
  }

  async deleteTemplate(gymId: string, templateId: string) {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: { id: templateId, gymId },
    });
    if (!template) throw new NotFoundException("Template not found");
    await this.prisma.whatsappTemplate.delete({ where: { id: templateId } });
  }

  async testSend(gymId: string, templateId: string, dto: TestTemplateSendDto) {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: { id: templateId, gymId },
    });
    if (!template) throw new NotFoundException("Template not found");
    if (!template.metaTemplateId) throw new BadRequestException("Template not yet approved (no metaTemplateId)");

    const bsp = this.bspFactory.get();
    const result = await bsp.sendTemplate({
      phone: dto.phone,
      metaTemplateId: template.metaTemplateId,
      variables: dto.variables,
    });

    await this.prisma.whatsappMessage.create({
      data: {
        gymId,
        templateId,
        toPhone: dto.phone,
        status: result.success ? "sent" : "failed",
        bspMessageId: result.bspMessageId,
        sentAt: result.success ? new Date() : undefined,
        error: result.error,
        costPaise: result.costPaise,
      },
    });

    return result;
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async listMessages(gymId: string, query: ListMessagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.WhatsappMessageWhereInput = {
      gymId,
      ...(query.memberId && { memberId: query.memberId }),
      ...(query.campaignId && { campaignId: query.campaignId }),
      ...(query.status && { status: query.status as never }),
    };

    const [total, messages] = await this.prisma.$transaction([
      this.prisma.whatsappMessage.count({ where }),
      this.prisma.whatsappMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { template: { select: { name: true } }, member: { select: { name: true, phone: true } } },
      }),
    ]);

    return { data: messages, meta: { page, limit, total } };
  }

  // ── Trigger Rules ─────────────────────────────────────────────────────────

  async listTriggerRules(gymId: string) {
    return this.prisma.whatsappTriggerRule.findMany({
      where: { gymId },
      include: { template: { select: { id: true, name: true, status: true } } },
      orderBy: { event: "asc" },
    });
  }

  async upsertTriggerRule(gymId: string, event: TriggerEvent, dto: UpsertTriggerRuleDto) {
    if (dto.templateId) {
      const template = await this.prisma.whatsappTemplate.findFirst({
        where: { id: dto.templateId, gymId },
      });
      if (!template) throw new NotFoundException("Template not found");
    }

    return this.prisma.whatsappTriggerRule.upsert({
      where: { gymId_event: { gymId, event } },
      create: {
        gymId,
        event,
        isActive: dto.isActive,
        templateId: dto.templateId,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        isActive: dto.isActive,
        templateId: dto.templateId,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  // ── Trigger Fire (called by other services) ───────────────────────────────

  async fireTrigger(
    gymId: string,
    event: TriggerEvent,
    memberId: string,
    context: Record<string, string> = {},
  ): Promise<void> {
    const rule = await this.prisma.whatsappTriggerRule.findUnique({
      where: { gymId_event: { gymId, event } },
      include: { template: true },
    });

    if (!rule?.isActive || !rule.templateId || !rule.template) return;
    if (!rule.template.metaTemplateId) return;

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId },
    });
    if (!member || member.doNotMessage) return;

    const optout = await this.prisma.whatsappOptout.findUnique({
      where: { gymId_memberId: { gymId, memberId } },
    });
    if (optout) return;

    const config = rule.config as Record<string, unknown>;
    const delayMs = typeof config["delayMinutes"] === "number"
      ? (config["delayMinutes"] as number) * 60 * 1000
      : 0;

    const variables = this.resolveVariables(
      rule.template.variables as string[],
      member,
      context,
    );

    await this.triggerQueue.add(
      "send",
      {
        gymId,
        memberId,
        phone: member.phone,
        templateId: rule.templateId,
        metaTemplateId: rule.template.metaTemplateId,
        variables,
        event,
      },
      { delay: delayMs, attempts: 2, backoff: { type: "fixed", delay: 5000 } },
    );
  }

  private resolveVariables(
    variableKeys: string[],
    member: { name: string; phone: string; expiresAt: Date | null },
    context: Record<string, string>,
  ): string[] {
    const map: Record<string, string> = {
      name: member.name,
      phone: member.phone,
      expires_at: member.expiresAt
        ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(member.expiresAt)
        : "",
      ...context,
    };
    return variableKeys.map((key) => map[key] ?? "");
  }

  // ── Opt-out ───────────────────────────────────────────────────────────────

  async handleOptout(gymId: string, phone: string): Promise<void> {
    const member = await this.prisma.member.findFirst({ where: { gymId, phone } });
    if (!member) return;

    await this.prisma.$transaction([
      this.prisma.whatsappOptout.upsert({
        where: { gymId_memberId: { gymId, memberId: member.id } },
        create: { gymId, memberId: member.id, phone, reason: "STOP reply" },
        update: { optedOutAt: new Date() },
      }),
      this.prisma.member.update({
        where: { id: member.id },
        data: { doNotMessage: true },
      }),
    ]);

    this.logger.log(`Opt-out recorded for ${phone} in gym ${gymId}`);
  }

  // ── Send a single message (used by trigger processor) ─────────────────────

  async sendAndLog(params: {
    gymId: string;
    memberId: string;
    templateId: string;
    metaTemplateId: string;
    phone: string;
    variables: string[];
    campaignId?: string;
    event?: string;
  }): Promise<void> {
    const bsp = this.bspFactory.get();

    const msg = await this.prisma.whatsappMessage.create({
      data: {
        gymId: params.gymId,
        memberId: params.memberId,
        templateId: params.templateId,
        campaignId: params.campaignId,
        toPhone: params.phone,
        status: "queued",
      },
    });

    const result = await bsp.sendTemplate({
      phone: params.phone,
      metaTemplateId: params.metaTemplateId,
      variables: params.variables,
    });

    await this.prisma.whatsappMessage.update({
      where: { id: msg.id },
      data: {
        status: result.success ? "sent" : "failed",
        bspMessageId: result.bspMessageId,
        sentAt: result.success ? new Date() : null,
        failedAt: result.success ? null : new Date(),
        error: result.error,
        costPaise: result.costPaise,
      },
    });

    if (!result.success) {
      this.logger.warn(`Failed to send to ${params.phone}: ${result.error}`);
    }
  }

  // ── Delivery webhook ──────────────────────────────────────────────────────

  async handleDeliveryWebhook(body: unknown, signature?: string): Promise<void> {
    const bsp = this.bspFactory.get();
    const parsed = bsp.parseWebhook(body, signature);
    if (!parsed) return;

    const msg = await this.prisma.whatsappMessage.findFirst({
      where: { bspMessageId: parsed.bspMessageId },
    });
    if (!msg) return;

    const now = new Date();
    await this.prisma.whatsappMessage.update({
      where: { id: msg.id },
      data: {
        status: parsed.status === "delivered" ? "delivered"
              : parsed.status === "read" ? "read"
              : "failed",
        deliveredAt: parsed.status === "delivered" ? now : undefined,
        readAt: parsed.status === "read" ? now : undefined,
        failedAt: parsed.status === "failed" ? now : undefined,
        error: parsed.errorCode,
      },
    });

    // Update campaign counts
    if (msg.campaignId) {
      const field = parsed.status === "delivered" ? { deliveredCount: { increment: 1 } }
                  : parsed.status === "read"      ? { readCount: { increment: 1 } }
                  : { failedCount: { increment: 1 } };
      await this.prisma.broadcastCampaign.update({
        where: { id: msg.campaignId },
        data: field,
      });
    }
  }

  // ── Cost stats ────────────────────────────────────────────────────────────

  async getCostStats(gymId: string, month: string) {
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(year!, mon! - 1, 1);
    const to = new Date(year!, mon!, 1);

    const result = await this.prisma.whatsappMessage.aggregate({
      where: { gymId, createdAt: { gte: from, lt: to }, status: { in: ["sent", "delivered", "read"] } },
      _sum: { costPaise: true },
      _count: { id: true },
    });

    return {
      totalMessages: result._count.id,
      totalCostPaise: result._sum.costPaise ?? 0,
      month,
    };
  }
}
