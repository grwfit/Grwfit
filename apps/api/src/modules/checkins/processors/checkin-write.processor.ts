import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { CHECKIN_WRITE_QUEUE } from "../checkins.service";

interface CheckinWriteJob {
  gymId: string;
  memberId: string;
  branchId: string | null;
  method: "qr" | "manual" | "biometric";
  deviceId: string | null;
  createdBy: string | null;
  checkedInAt: string;
}

@Processor(CHECKIN_WRITE_QUEUE)
export class CheckinWriteProcessor {
  private readonly logger = new Logger(CheckinWriteProcessor.name);

  @Process()
  async handle(job: Job<CheckinWriteJob>) {
    const { gymId, memberId, branchId, method, deviceId, createdBy, checkedInAt } = job.data;
    const prisma = getPrismaClient();

    // Double-check dedup at DB level (in case of race between workers)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await prisma.checkin.findFirst({
      where: { gymId, memberId, checkedInAt: { gte: thirtyMinAgo } },
      select: { id: true },
    });

    if (recent) {
      this.logger.debug(`Dedup at DB level: member ${memberId} already checked in`);
      return;
    }

    await prisma.checkin.create({
      data: {
        gymId,
        memberId,
        branchId,
        method,
        deviceId,
        createdBy,
        checkedInAt: new Date(checkedInAt),
      },
    });

    this.logger.debug(`Checkin written: ${memberId} @ ${gymId}`);
  }
}
