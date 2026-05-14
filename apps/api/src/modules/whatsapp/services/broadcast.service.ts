import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { BROADCAST_QUEUE } from "../whatsapp.service";
import type { CreateBroadcastDto } from "../dto/whatsapp.dto";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private readonly prisma = getPrismaClient();

  constructor(@InjectQueue(BROADCAST_QUEUE) private readonly broadcastQueue: Queue) {}

  async listCampaigns(gymId: string) {
    return this.prisma.broadcastCampaign.findMany({
      where: { gymId },
      include: { template: { select: { name: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCampaign(gymId: string, campaignId: string) {
    const campaign = await this.prisma.broadcastCampaign.findFirst({
      where: { id: campaignId, gymId },
      include: { template: true },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async createCampaign(gymId: string, staffId: string, dto: CreateBroadcastDto) {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: { id: dto.templateId, gymId },
    });
    if (!template) throw new NotFoundException("Template not found");
    if (template.status !== "approved") {
      throw new BadRequestException("Template must be approved before broadcasting");
    }

    const audienceFilter = dto.audienceFilter ?? {};
    const totalCount = await this.countAudience(gymId, audienceFilter);

    return this.prisma.broadcastCampaign.create({
      data: {
        gymId,
        templateId: dto.templateId,
        name: dto.name,
        audienceFilter: audienceFilter as Prisma.InputJsonValue,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        totalCount,
        status: dto.scheduledFor ? "scheduled" : "draft",
        createdBy: staffId,
      },
    });
  }

  async sendCampaign(gymId: string, campaignId: string) {
    const campaign = await this.prisma.broadcastCampaign.findFirst({
      where: { id: campaignId, gymId },
      include: { template: true },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!["draft", "scheduled"].includes(campaign.status)) {
      throw new BadRequestException(`Cannot send campaign in status: ${campaign.status}`);
    }
    if (!campaign.template.metaTemplateId) {
      throw new BadRequestException("Template has no Meta template ID");
    }

    const members = await this.fetchAudience(gymId, campaign.audienceFilter as Record<string, unknown>);

    await this.prisma.broadcastCampaign.update({
      where: { id: campaignId },
      data: { status: "running", startedAt: new Date(), totalCount: members.length },
    });

    // Queue in batches; BullMQ rate limit handled in processor (80/sec)
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!;
      await this.broadcastQueue.add(
        "send",
        {
          gymId,
          campaignId,
          memberId: member.id,
          phone: member.phone,
          templateId: campaign.templateId,
          metaTemplateId: campaign.template.metaTemplateId,
          memberName: member.name,
        },
        {
          delay: Math.floor(i / 80) * 1000, // 80 per second
          attempts: 2,
          backoff: { type: "fixed", delay: 5000 },
        },
      );
    }

    this.logger.log(`Queued ${members.length} messages for campaign ${campaignId}`);
    return { queued: members.length };
  }

  async cancelCampaign(gymId: string, campaignId: string) {
    const campaign = await this.prisma.broadcastCampaign.findFirst({
      where: { id: campaignId, gymId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!["draft", "scheduled", "running"].includes(campaign.status)) {
      throw new BadRequestException("Campaign cannot be cancelled");
    }

    return this.prisma.broadcastCampaign.update({
      where: { id: campaignId },
      data: { status: "cancelled" },
    });
  }

  async previewAudienceCount(gymId: string, audienceFilter: Record<string, unknown>) {
    const count = await this.countAudience(gymId, audienceFilter);
    return { count };
  }

  private async countAudience(gymId: string, filter: Record<string, unknown>): Promise<number> {
    const where = this.buildAudienceWhere(gymId, filter);
    return this.prisma.member.count({ where });
  }

  private async fetchAudience(gymId: string, filter: Record<string, unknown>) {
    const where = this.buildAudienceWhere(gymId, filter);
    return this.prisma.member.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });
  }

  private buildAudienceWhere(gymId: string, filter: Record<string, unknown>): Prisma.MemberWhereInput {
    return {
      gymId,
      deletedAt: null,
      doNotMessage: false,
      ...(filter["status"] ? { status: filter["status"] as never } : {}),
      ...(filter["trainerId"] ? { assignedTrainerId: String(filter["trainerId"]) } : {}),
      ...(filter["branchId"] ? { branchId: String(filter["branchId"]) } : {}),
    };
  }
}
