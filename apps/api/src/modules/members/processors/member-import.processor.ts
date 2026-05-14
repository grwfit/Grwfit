import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { MEMBER_IMPORT_QUEUE, MembersImportService } from "../members-import.service";

interface ImportJobData {
  gymId: string;
  rows: Array<{ name: string; phone: string; email?: string; gender?: string; dob?: string }>;
  createdBy: string;
}

@Processor(MEMBER_IMPORT_QUEUE)
export class MemberImportProcessor {
  private readonly logger = new Logger(MemberImportProcessor.name);

  constructor(private readonly importService: MembersImportService) {}

  @Process()
  async handle(job: Job<ImportJobData>) {
    const { gymId, rows, createdBy } = job.data;
    const prisma = getPrismaClient();

    this.logger.log(`Processing import job ${job.id}: ${rows.length} rows for gym ${gymId}`);

    // Create tracking record
    const importJob = await prisma.memberImportJob.create({
      data: {
        id: String(job.id),
        gymId,
        createdBy,
        totalRows: rows.length,
        status: "processing",
      },
    });

    try {
      const BATCH = 50;
      let succeeded = 0;
      let failed = 0;
      const allErrors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const result = await this.importService.processRows(gymId, batch, createdBy);
        succeeded += result.succeeded;
        failed += result.failed;
        allErrors.push(...result.errors);

        await prisma.memberImportJob.update({
          where: { id: importJob.id },
          data: { processed: i + batch.length, succeeded, failed, errors: allErrors },
        });

        await job.progress(Math.round(((i + batch.length) / rows.length) * 100));
      }

      await prisma.memberImportJob.update({
        where: { id: importJob.id },
        data: { status: "completed", completedAt: new Date() },
      });

      this.logger.log(`Import job ${job.id} done: ${succeeded} ok, ${failed} failed`);
    } catch (err) {
      await prisma.memberImportJob.update({
        where: { id: importJob.id },
        data: { status: "failed" },
      });
      throw err;
    }
  }
}
