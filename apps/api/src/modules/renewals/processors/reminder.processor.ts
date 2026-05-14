import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { WhatsAppModuleService } from "../../whatsapp/whatsapp.service";
import { RedisService } from "../../../common/services/redis.service";
import { REMINDER_QUEUE } from "../renewals.service";
import type { TriggerEvent } from "@grwfit/db";
import { differenceInDays } from "date-fns";

interface ReminderJob {
  gymId: string;
  memberIds: string[];
  triggerType?: string;
  gymName?: string;
  templateId?: string;
  includeOffer?: boolean;
  offerPct?: number;
  staffId?: string;
}

@Processor(REMINDER_QUEUE)
export class ReminderProcessor {
  private readonly logger = new Logger(ReminderProcessor.name);

  // triggerType → TriggerEvent enum mapping
  private static readonly TRIGGER_MAP: Record<string, TriggerEvent> = {
    days_7_before: "renewal_7d",
    days_3_before: "renewal_3d",
    days_1_before: "renewal_1d",
    on_expiry:     "renewal_expired",
    days_7_after:  "renewal_7d_after",
    days_30_after: "renewal_30d_after",
  };

  constructor(
    private readonly whatsAppModule: WhatsAppModuleService,
    private readonly redis: RedisService,
  ) {}

  @Process()
  async handle(job: Job<ReminderJob>) {
    const {
      gymId, memberIds, triggerType, gymName,
      templateId, includeOffer = false, offerPct = 10, staffId,
    } = job.data;

    const prisma = getPrismaClient();
    const gym = gymName ? { name: gymName } : await prisma.gym.findUnique({ where: { id: gymId }, select: { name: true } });

    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, gymId, deletedAt: null, doNotMessage: false },
      select: { id: true, name: true, phone: true, expiresAt: true, createdBy: true },
    });

    this.logger.log(`Processing ${members.length} reminders for gym ${gymId}`);

    let sent = 0;
    let failed = 0;

    for (const member of members) {
      // BSP rate limiting: 80 msg/sec. Add small delay between sends.
      await new Promise((r) => setTimeout(r, 13)); // ~77/sec

      const trigger = triggerType ?? this.detectTrigger(member.expiresAt);
      const triggerEvent = ReminderProcessor.TRIGGER_MAP[trigger];

      let sent_ok = false;
      if (triggerEvent) {
        try {
          await this.whatsAppModule.fireTrigger(gymId, triggerEvent, member.id, {
            name: member.name.split(" ")[0]!,
          });
          sent_ok = true;
        } catch {
          sent_ok = false;
        }
      }

      await prisma.renewalReminder.create({
        data: {
          gymId,
          memberId: member.id,
          triggerType: trigger,
          templateId: templateId ?? null,
          channel: "whatsapp",
          status: sent_ok ? "sent" : "failed",
        },
      });

      if (sent_ok) {
        // Redis dedup: mark this trigger as sent for this member (25h TTL)
        const dedupKey = `reminder_sent:${gymId}:${member.id}:${trigger}`;
        await this.redis.set(dedupKey, "1", 25 * 3600);

        // Auto-create follow-up record (assigned to whoever created the member)
        const assignedStaffId = staffId ?? member.createdBy ?? gymId; // fallback
        await prisma.renewalFollowUp.create({
          data: {
            gymId,
            memberId: member.id,
            staffId: assignedStaffId,
            outcome: "contacted",
            notes: `Auto-reminder sent: ${trigger}`,
          },
        });

        sent++;
      } else {
        failed++;
      }
      sent_ok = false; // reset for next iteration

      await job.progress(Math.round(((sent + failed) / members.length) * 100));
    }

    // Invalidate dashboard cache
    await this.redis.del(`renewals_summary:${gymId}`);

    this.logger.log(`Reminder job ${job.id}: ${sent} sent, ${failed} failed`);
  }

  private detectTrigger(expiresAt: Date | null): string {
    if (!expiresAt) return "on_expiry";
    const days = differenceInDays(expiresAt, new Date());
    if (days >= 7) return "days_7_before";
    if (days >= 3) return "days_3_before";
    if (days >= 1) return "days_1_before";
    if (days === 0) return "on_expiry";
    if (days >= -7) return "days_7_after";
    return "days_30_after";
  }
}
