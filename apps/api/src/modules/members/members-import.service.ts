import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import * as crypto from "crypto";
import { getPrismaClient } from "@grwfit/db";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

export const MEMBER_IMPORT_QUEUE = "member-import";

interface CsvRow {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
}

interface ParseResult {
  valid: CsvRow[];
  errors: Array<{ row: number; phone?: string; error: string }>;
}

interface ImportPreview {
  preview: CsvRow[];
  total: number;
  valid: number;
  errors: Array<{ row: number; phone?: string; error: string }>;
}

@Injectable()
export class MembersImportService {
  private readonly logger = new Logger(MembersImportService.name);

  constructor(
    @InjectQueue(MEMBER_IMPORT_QUEUE)
    private readonly importQueue: Queue,
  ) {}

  /** Parse CSV text and return preview (first 10 rows) + validation summary */
  parsePreview(csvText: string): ImportPreview {
    const { valid, errors } = this.parseCsv(csvText);
    return {
      preview: valid.slice(0, 10),
      total: valid.length + errors.length,
      valid: valid.length,
      errors,
    };
  }

  /** Commit import: sync for ≤100 rows, async (BullMQ) for >100 */
  async commitImport(
    gymId: string,
    csvText: string,
    req: AuthenticatedRequest,
  ): Promise<{ jobId?: string; imported?: number; errors?: Array<{ row: number; error: string }> }> {
    const { valid, errors } = this.parseCsv(csvText);

    if (valid.length === 0) {
      throw new BadRequestException("No valid rows found in CSV");
    }

    if (valid.length > 100) {
      // Background job
      const job = await this.importQueue.add(
        { gymId, rows: valid, createdBy: req.userId },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      );
      this.logger.log(`Queued member import job ${job.id} for gym ${gymId}: ${valid.length} rows`);
      return { jobId: String(job.id) };
    }

    // Synchronous for small batches
    const result = await this.processRows(gymId, valid, req.userId!);
    return { imported: result.succeeded, errors: result.errors };
  }

  async processRows(
    gymId: string,
    rows: CsvRow[],
    createdBy: string,
  ): Promise<{ succeeded: number; failed: number; errors: Array<{ row: number; error: string }> }> {
    const prisma = getPrismaClient();
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        const existing = await prisma.member.findFirst({ where: { gymId, phone: row.phone } });
        if (existing) {
          errors.push({ row: i + 2, error: `Phone ${row.phone} already exists` });
          failed++;
          continue;
        }

        const memberId = crypto.randomUUID();
        await prisma.member.create({
          data: {
            id: memberId,
            gymId,
            phone: row.phone,
            name: row.name,
            email: row.email ?? null,
            gender: (row.gender as "male" | "female" | "other" | "prefer_not_to_say" | null) ?? null,
            dob: row.dob ? new Date(row.dob) : null,
            qrCode: `GRW-${memberId.toUpperCase()}`,
            status: "trial",
            joinedAt: new Date(),
            createdBy,
          },
        });
        succeeded++;
      } catch (err) {
        errors.push({ row: i + 2, error: err instanceof Error ? err.message : "Unknown error" });
        failed++;
      }
    }

    return { succeeded, failed, errors };
  }

  async getJobStatus(jobId: string) {
    const prisma = getPrismaClient();
    const job = await prisma.memberImportJob.findUnique({ where: { id: jobId } });
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      total: job.totalRows,
      processed: job.processed,
      succeeded: job.succeeded,
      failed: job.failed,
      errors: job.errors,
      completedAt: job.completedAt,
    };
  }

  private parseCsv(text: string): ParseResult {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (lines.length < 2) throw new BadRequestException("CSV must have a header row and at least one data row");

    const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
    const nameIdx = header.findIndex((h) => h === "name" || h === "full name" || h === "member name");
    const phoneIdx = header.findIndex((h) => h === "phone" || h === "mobile" || h === "phone number");

    if (nameIdx === -1 || phoneIdx === -1) {
      throw new BadRequestException("CSV must have 'name' and 'phone' columns");
    }

    const emailIdx = header.indexOf("email");
    const genderIdx = header.indexOf("gender");
    const dobIdx = header.findIndex((h) => h === "dob" || h === "date of birth" || h === "birthdate");

    const valid: CsvRow[] = [];
    const errors: Array<{ row: number; phone?: string; error: string }> = [];
    const seenPhones = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      const cols = this.parseCsvLine(line);
      const rawPhone = cols[phoneIdx]?.trim() ?? "";
      const phone = rawPhone.startsWith("+91") ? rawPhone : `+91${rawPhone}`;
      const name = cols[nameIdx]?.trim() ?? "";

      if (!name) { errors.push({ row: i + 1, error: "Name is empty" }); continue; }
      if (!/^\+91[6-9]\d{9}$/.test(phone)) {
        errors.push({ row: i + 1, phone, error: `Invalid phone: ${rawPhone}` }); continue;
      }
      if (seenPhones.has(phone)) {
        errors.push({ row: i + 1, phone, error: `Duplicate phone in CSV: ${phone}` }); continue;
      }

      seenPhones.add(phone);
      valid.push({
        name,
        phone,
        email: emailIdx >= 0 ? (cols[emailIdx]?.trim() || undefined) : undefined,
        gender: genderIdx >= 0 ? (cols[genderIdx]?.trim().toLowerCase() || undefined) : undefined,
        dob: dobIdx >= 0 ? (cols[dobIdx]?.trim() || undefined) : undefined,
      });
    }

    return { valid, errors };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        result.push(current); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
}
