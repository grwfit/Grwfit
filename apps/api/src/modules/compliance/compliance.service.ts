import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { getPrismaClient } from "@grwfit/db";
import { subDays, subYears } from "date-fns";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly prisma = getPrismaClient();

  // ── Consent management ────────────────────────────────────────────────────

  async getConsents(gymId: string, memberId: string) {
    return this.prisma.consent.findMany({ where: { gymId, memberId } });
  }

  async grantConsent(gymId: string, memberId: string, types: Array<"operational" | "marketing" | "analytics">) {
    const ops = types.map((type) =>
      this.prisma.consent.upsert({
        where: { gymId_memberId_type: { gymId, memberId, type } },
        create: { gymId, memberId, type, granted: true, grantedAt: new Date() },
        update: { granted: true, grantedAt: new Date(), revokedAt: null },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  async revokeConsent(gymId: string, memberId: string, type: "operational" | "marketing" | "analytics") {
    return this.prisma.consent.update({
      where: { gymId_memberId_type: { gymId, memberId, type } },
      data: { granted: false, revokedAt: new Date() },
    });
  }

  // ── Data export (Right to Access) ────────────────────────────────────────

  async requestDataExport(gymId: string, memberId: string) {
    // Check for pending/processing request
    const existing = await this.prisma.dataExportRequest.findFirst({
      where: { gymId, memberId, status: { in: ["pending", "processing"] } },
    });
    if (existing) return existing;

    const request = await this.prisma.dataExportRequest.create({
      data: { gymId, memberId, status: "pending" },
    });

    // Process asynchronously (non-blocking)
    void this.processDataExport(request.id, gymId, memberId);
    return request;
  }

  private async processDataExport(requestId: string, gymId: string, memberId: string) {
    try {
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: "processing" },
      });

      const [member, payments, checkins, workoutPlan, dietPlan, progressLogs, consents] =
        await this.prisma.$transaction([
          this.prisma.member.findFirst({ where: { id: memberId, gymId } }),
          this.prisma.payment.findMany({ where: { gymId, memberId }, select: { paidAt: true, totalPaise: true, mode: true, invoiceNumber: true } }),
          this.prisma.checkin.findMany({ where: { gymId, memberId }, select: { checkedInAt: true, method: true }, orderBy: { checkedInAt: "desc" }, take: 100 }),
          this.prisma.workoutPlan.findFirst({ where: { gymId, memberId, isActive: true } }),
          this.prisma.dietPlan.findFirst({ where: { gymId, memberId, isActive: true } }),
          this.prisma.progressLog.findMany({ where: { gymId, memberId }, orderBy: { loggedAt: "desc" } }),
          this.prisma.consent.findMany({ where: { gymId, memberId } }),
        ]);

      const exportData = {
        generatedAt: new Date().toISOString(),
        member: {
          name: member?.name,
          phone: member?.phone,
          email: member?.email,
          dob: member?.dob,
          gender: member?.gender,
          joinedAt: member?.joinedAt,
          status: member?.status,
        },
        payments: payments.map((p) => ({
          date: p.paidAt,
          amount: `₹${(p.totalPaise / 100).toFixed(2)}`,
          mode: p.mode,
          invoice: p.invoiceNumber,
        })),
        checkins: checkins.map((c) => ({ date: c.checkedInAt, method: c.method })),
        workoutPlan: workoutPlan ? { name: workoutPlan.name, week: workoutPlan.week } : null,
        dietPlan: dietPlan ? { meals: dietPlan.meals, calories: dietPlan.calories } : null,
        progress: progressLogs.map((l) => ({
          date: l.loggedAt,
          weight: l.weightGrams ? `${(l.weightGrams / 1000).toFixed(1)}kg` : null,
          notes: l.notes,
        })),
        consents: consents.map((c) => ({ type: c.type, granted: c.granted, date: c.grantedAt })),
      };

      // In production: upload JSON to Supabase Storage and return signed URL
      // For now, store as inline JSON reference
      const fileUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(exportData, null, 2)).toString("base64")}`;

      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: "completed", completedAt: new Date(), fileUrl },
      });

      this.logger.log(`Data export completed for member ${memberId}`);
    } catch (err) {
      this.logger.error(`Data export failed for ${memberId}: ${err}`);
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: "failed" },
      });
    }
  }

  async getExportStatus(gymId: string, memberId: string) {
    const req = await this.prisma.dataExportRequest.findFirst({
      where: { gymId, memberId },
      orderBy: { createdAt: "desc" },
    });
    return req;
  }

  // ── Deletion request (Right to Erasure) ──────────────────────────────────

  async requestDeletion(gymId: string, memberId: string, reason?: string) {
    const existing = await this.prisma.dataDeletionRequest.findFirst({
      where: { gymId, memberId, status: { in: ["pending", "approved"] } },
    });
    if (existing) throw new BadRequestException("A deletion request is already pending or approved");

    return this.prisma.dataDeletionRequest.create({
      data: { gymId, memberId, reason: reason ?? null },
    });
  }

  async listDeletionRequests(gymId: string) {
    return this.prisma.dataDeletionRequest.findMany({
      where: { gymId },
      orderBy: { requestedAt: "desc" },
      include: {
        member: { select: { name: true, phone: true } },
      },
    });
  }

  async approveDeletion(gymId: string, requestId: string, req: AuthenticatedRequest) {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, gymId, status: "pending" },
    });
    if (!request) throw new NotFoundException("Request not found or already processed");

    // Soft-delete: anonymise PII
    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: request.memberId },
        data: {
          name: "Deleted User",
          phone: `DELETED_${Date.now()}`,
          email: null,
          photoUrl: null,
          emergencyContactPhone: null,
          emergencyContactName: null,
          healthNotes: null,
          medicalConditions: null,
          deletedAt: new Date(),
        },
      }),
      this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: "approved", approvedAt: new Date(), approvedBy: req.userId },
      }),
      this.prisma.auditLog.create({
        data: {
          gymId,
          actorId: req.userId!,
          actorType: "staff",
          action: "delete",
          entity: "members",
          entityId: request.memberId,
          diff: { reason: "DPDP deletion request approved" },
        },
      }),
    ]);

    this.logger.log(`Member ${request.memberId} PII anonymised per DPDP request ${requestId}`);
    return { success: true };
  }

  async rejectDeletion(gymId: string, requestId: string) {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, gymId, status: "pending" },
    });
    if (!request) throw new NotFoundException("Request not found");
    return this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
    });
  }

  // ── Audit log search ──────────────────────────────────────────────────────

  async searchAuditLog(gymId: string, params: {
    actorId?: string; action?: string; entity?: string;
    from?: string; to?: string; page?: number; limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where = {
      gymId,
      ...(params.actorId && { actorId: params.actorId }),
      ...(params.action && { action: params.action as never }),
      ...(params.entity && { entity: params.entity }),
      ...((params.from || params.to) && {
        createdAt: {
          ...(params.from && { gte: new Date(params.from) }),
          ...(params.to && { lte: new Date(params.to) }),
        },
      }),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data: logs, meta: { page, limit, total } };
  }

  // ── Retention cron: hard-delete 30 days after soft-delete ─────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async enforceRetentionPolicies() {
    // Hard-delete members approved for deletion 30+ days ago
    const cutoff = subDays(new Date(), 30);
    const approved = await this.prisma.dataDeletionRequest.findMany({
      where: { status: "approved", approvedAt: { lt: cutoff }, deletedAt: null },
    });

    for (const req of approved) {
      try {
        await this.prisma.$transaction([
          this.prisma.member.delete({ where: { id: req.memberId } }),
          this.prisma.dataDeletionRequest.update({
            where: { id: req.id },
            data: { status: "deleted", deletedAt: new Date() },
          }),
        ]);
        this.logger.log(`Hard-deleted member ${req.memberId} per DPDP retention policy`);
      } catch (err) {
        this.logger.error(`Hard-delete failed for ${req.memberId}: ${err}`);
      }
    }

    // Archive inactive members (> 2 years no check-in) — soft archive only
    const twoYearsAgo = subYears(new Date(), 2);
    const inactive = await this.prisma.member.count({
      where: {
        deletedAt: null,
        updatedAt: { lt: twoYearsAgo },
        checkins: { none: { checkedInAt: { gt: twoYearsAgo } } },
      },
    });
    if (inactive > 0) {
      this.logger.log(`${inactive} members eligible for archival (>2yr inactive)`);
    }
  }
}
