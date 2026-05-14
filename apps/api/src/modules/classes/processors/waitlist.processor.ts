import { Processor, Process } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from "bull";
import { getPrismaClient } from "@grwfit/db";
import { WAITLIST_QUEUE } from "../classes.service";

@Processor(WAITLIST_QUEUE)
export class WaitlistProcessor {
  private readonly logger = new Logger(WaitlistProcessor.name);
  private readonly prisma = getPrismaClient();

  @Process("promote")
  async promoteFromWaitlist(job: Job<{ gymId: string; instanceId: string }>) {
    const { gymId, instanceId } = job.data;

    const instance = await this.prisma.classInstance.findFirst({ where: { id: instanceId } });
    if (!instance) return;

    const confirmedCount = await this.prisma.classBooking.count({
      where: { instanceId, status: "confirmed" },
    });

    if (confirmedCount >= instance.capacity) return; // Still full

    const next = await this.prisma.classWaitlist.findFirst({
      where: { instanceId },
      orderBy: { position: "asc" },
    });
    if (!next) return;

    await this.prisma.$transaction([
      this.prisma.classWaitlist.delete({ where: { id: next.id } }),
      this.prisma.classBooking.create({
        data: {
          gymId,
          instanceId,
          memberId: next.memberId,
          status: "confirmed",
        },
      }),
    ]);

    this.logger.log(`Promoted member ${next.memberId} from waitlist for class ${instanceId}`);
  }
}
