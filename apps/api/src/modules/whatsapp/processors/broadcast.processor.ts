import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from "bull";
import { WhatsAppModuleService, BROADCAST_QUEUE } from "../whatsapp.service";
import { getPrismaClient } from "@grwfit/db";

interface BroadcastJob {
  gymId: string;
  campaignId: string;
  memberId: string;
  phone: string;
  templateId: string;
  metaTemplateId: string;
  memberName: string;
}

@Processor(BROADCAST_QUEUE)
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);
  private readonly prisma = getPrismaClient();

  constructor(private readonly whatsappService: WhatsAppModuleService) {}

  @Process("send")
  async handleSend(job: Job<BroadcastJob>) {
    const { gymId, campaignId, memberId, phone, templateId, metaTemplateId, memberName } = job.data;

    try {
      // Check opt-out just before sending (could have opted out since campaign was queued)
      const optout = await this.prisma.whatsappOptout.findUnique({
        where: { gymId_memberId: { gymId, memberId } },
      });
      if (optout) {
        await this.prisma.broadcastCampaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 }, failedCount: { increment: 1 } },
        });
        return;
      }

      await this.whatsappService.sendAndLog({
        gymId,
        memberId,
        templateId,
        metaTemplateId,
        phone,
        variables: [memberName],
        campaignId,
      });

      await this.prisma.broadcastCampaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 } },
      });
    } catch (err) {
      this.logger.error(`Broadcast job failed for ${phone}: ${err}`);
      await this.prisma.broadcastCampaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 }, failedCount: { increment: 1 } },
      });
      throw err;
    } finally {
      // Mark completed when last message sent
      const campaign = await this.prisma.broadcastCampaign.findUnique({
        where: { id: campaignId },
        select: { totalCount: true, sentCount: true, status: true },
      });
      if (campaign && campaign.sentCount >= campaign.totalCount && campaign.status === "running") {
        await this.prisma.broadcastCampaign.update({
          where: { id: campaignId },
          data: { status: "completed", completedAt: new Date() },
        });
      }
    }
  }
}
