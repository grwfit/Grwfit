import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import type {
  UpdateTrainerProfileDto, AssignTrainerDto,
  ListCommissionsQueryDto, ApproveCommissionsDto, MarkPaidDto,
} from "./dto/trainers.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@Injectable()
export class TrainersService {
  private readonly logger = new Logger(TrainersService.name);
  private readonly prisma = getPrismaClient();

  // ── Trainer profiles ──────────────────────────────────────────────────────

  async listTrainers(gymId: string) {
    const trainers = await this.prisma.staffUser.findMany({
      where: { gymId, role: "trainer", isActive: true },
      select: {
        id: true, name: true, phone: true, email: true,
        commissionPct: true, branchId: true, lastLoginAt: true,
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // Count assigned members per trainer
    const counts = await this.prisma.member.groupBy({
      by: ["assignedTrainerId"],
      where: { gymId, assignedTrainerId: { in: trainers.map((t) => t.id) }, deletedAt: null },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.assignedTrainerId!, c._count.id]));

    return trainers.map((t) => ({ ...t, memberCount: countMap.get(t.id) ?? 0 }));
  }

  async getTrainer(gymId: string, trainerId: string) {
    const trainer = await this.prisma.staffUser.findFirst({
      where: { id: trainerId, gymId, role: "trainer" },
      include: { branch: { select: { name: true } } },
    });
    if (!trainer) throw new NotFoundException("Trainer not found");
    return trainer;
  }

  async updateTrainerProfile(gymId: string, trainerId: string, dto: UpdateTrainerProfileDto) {
    const trainer = await this.prisma.staffUser.findFirst({ where: { id: trainerId, gymId, role: "trainer" } });
    if (!trainer) throw new NotFoundException("Trainer not found");

    return this.prisma.staffUser.update({
      where: { id: trainerId },
      data: {
        ...(dto.commissionPct !== undefined && { commissionPct: dto.commissionPct }),
      },
    });
  }

  async getTrainerDashboard(gymId: string, trainerId: string) {
    const [memberCount, pendingCommissionAgg, recentMembers] = await this.prisma.$transaction([
      this.prisma.member.count({ where: { gymId, assignedTrainerId: trainerId, deletedAt: null } }),
      this.prisma.commission.aggregate({
        where: { gymId, trainerId, status: "pending" },
        _sum: { amountPaise: true },
        _count: { id: true },
      }),
      this.prisma.member.findMany({
        where: { gymId, assignedTrainerId: trainerId, deletedAt: null },
        select: { id: true, name: true, phone: true, status: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      memberCount,
      pendingCommissionPaise: pendingCommissionAgg._sum.amountPaise ?? 0,
      pendingCommissionCount: pendingCommissionAgg._count.id,
      recentMembers,
    };
  }

  // ── Member assignment ─────────────────────────────────────────────────────

  async assignTrainer(gymId: string, memberId: string, dto: AssignTrainerDto, req: AuthenticatedRequest) {
    const [member, trainer] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: memberId, gymId } }),
      this.prisma.staffUser.findFirst({ where: { id: dto.trainerId, gymId, role: "trainer" } }),
    ]);
    if (!member) throw new NotFoundException("Member not found");
    if (!trainer) throw new NotFoundException("Trainer not found");

    return this.prisma.member.update({
      where: { id: memberId },
      data: { assignedTrainerId: dto.trainerId },
    });
  }

  async unassignTrainer(gymId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");
    return this.prisma.member.update({ where: { id: memberId }, data: { assignedTrainerId: null } });
  }

  async getAssignedMembers(gymId: string, trainerId: string) {
    return this.prisma.member.findMany({
      where: { gymId, assignedTrainerId: trainerId, deletedAt: null },
      select: {
        id: true, name: true, phone: true, status: true,
        expiresAt: true, photoUrl: true, joinedAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  // ── Commission ────────────────────────────────────────────────────────────

  async createCommissionForPayment(params: {
    gymId: string;
    trainerId: string;
    memberId: string;
    paymentId: string;
    totalPaise: number;
    commissionPct: number;
  }): Promise<void> {
    const amountPaise = Math.round(params.totalPaise * (params.commissionPct / 100));
    if (amountPaise <= 0) return;

    await this.prisma.commission.create({
      data: {
        gymId: params.gymId,
        trainerId: params.trainerId,
        memberId: params.memberId,
        paymentId: params.paymentId,
        amountPaise,
        status: "pending",
      },
    });
    this.logger.log(`Commission ₹${amountPaise / 100} created for trainer ${params.trainerId}`);
  }

  async listCommissions(gymId: string, query: ListCommissionsQueryDto, req: AuthenticatedRequest) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    // Trainers can only see their own commissions
    let trainerId = query.trainerId;
    if (req.userRole === "trainer") {
      trainerId = req.userId;
    }

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (query.month) {
      const [y, m] = query.month.split("-").map(Number);
      fromDate = new Date(y!, m! - 1, 1);
      toDate = new Date(y!, m!, 1);
    }

    const where: Prisma.CommissionWhereInput = {
      gymId,
      ...(trainerId && { trainerId }),
      ...(query.status && { status: query.status as never }),
      ...(fromDate && toDate && { createdAt: { gte: fromDate, lt: toDate } }),
    };

    const [total, commissions] = await this.prisma.$transaction([
      this.prisma.commission.count({ where }),
      this.prisma.commission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: { select: { invoiceNumber: true, paidAt: true, totalPaise: true } },
        },
      }),
    ]);

    return { data: commissions, meta: { page, limit, total } };
  }

  async getMonthlyPayoutReport(gymId: string, month: string) {
    const [y, m] = month.split("-").map(Number);
    const from = new Date(y!, m! - 1, 1);
    const to = new Date(y!, m!, 1);

    const rows = await this.prisma.commission.groupBy({
      by: ["trainerId"],
      where: { gymId, status: { in: ["pending", "approved"] }, createdAt: { gte: from, lt: to } },
      _sum: { amountPaise: true },
      _count: { id: true },
    });

    const trainerIds = rows.map((r: { trainerId: string }) => r.trainerId);
    const trainers = await this.prisma.staffUser.findMany({
      where: { id: { in: trainerIds } },
      select: { id: true, name: true, phone: true },
    });
    const trainerMap = new Map(trainers.map((t: { id: string; name: string; phone: string }) => [t.id, t]));

    return rows.map((r: { trainerId: string; _sum: Record<string, number | null>; _count: Record<string, number> }) => ({
      trainer: trainerMap.get(r.trainerId) ?? { id: r.trainerId, name: "Unknown", phone: "" },
      totalPaise: r._sum["amountPaise"] ?? 0,
      count: r._count["id"] ?? 0,
    }));
  }

  async approveCommissions(gymId: string, dto: ApproveCommissionsDto, req: AuthenticatedRequest) {
    await this.prisma.commission.updateMany({
      where: { id: { in: dto.commissionIds }, gymId, status: "pending" },
      data: { status: "approved", approvedBy: req.userId, approvedAt: new Date() },
    });
  }

  async markPaid(gymId: string, dto: MarkPaidDto, req: AuthenticatedRequest) {
    await this.prisma.commission.updateMany({
      where: { id: { in: dto.commissionIds }, gymId, status: "approved" },
      data: { status: "paid", paidAt: new Date(), notes: dto.notes },
    });
  }
}
