import { Injectable, Logger, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { subDays, startOfMonth } from "date-fns";
import type { AppConfig } from "../../config/configuration";
import type { ListGymsQueryDto, ImpersonateDto, AuditLogQueryDto } from "./dto/platform.dto";

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  private readonly prisma = getPrismaClient();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  // ── Overview ──────────────────────────────────────────────────────────────

  async getOverview() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subDays(monthStart, 1));

    const [
      totalGyms, activeGyms, trialGyms,
      totalMembers,
      mrrCurrent, mrrPrev,
      recentGyms,
    ] = await this.prisma.$transaction([
      this.prisma.gym.count(),
      this.prisma.gym.count({ where: { status: "active" } }),
      this.prisma.gym.count({ where: { status: "trial" } }),
      this.prisma.member.count({ where: { deletedAt: null, status: "active" } }),
      // MRR proxy: sum of payments this month
      this.prisma.payment.aggregate({
        where: { status: "captured", paidAt: { gte: monthStart } },
        _sum: { totalPaise: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: "captured", paidAt: { gte: prevMonthStart, lt: monthStart } },
        _sum: { totalPaise: true },
      }),
      this.prisma.gym.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, slug: true, status: true, planTier: true, createdAt: true },
      }),
    ]);

    const mrr = mrrCurrent._sum.totalPaise ?? 0;
    const prevMrr = mrrPrev._sum.totalPaise ?? 0;
    const mrrGrowth = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 100) : null;

    return {
      totalGyms,
      activeGyms,
      trialGyms,
      totalMembers,
      mrrPaise: mrr,
      arrPaise: mrr * 12,
      mrrGrowth,
      recentGyms,
    };
  }

  // ── Gyms ─────────────────────────────────────────────────────────────────

  async listGyms(query: ListGymsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const where: Prisma.GymWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { slug: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ],
      }),
      ...(query.planTier && { planTier: query.planTier as never }),
      ...(query.status && { status: query.status as never }),
    };

    const [total, gyms] = await this.prisma.$transaction([
      this.prisma.gym.count({ where }),
      this.prisma.gym.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, slug: true, planTier: true, status: true,
          phone: true, gstNo: true, createdAt: true, trialEndsAt: true,
          _count: { select: { members: true, staffUsers: true } },
        },
      }),
    ]);

    // Calculate health scores
    const gymIds = gyms.map((g) => g.id);

    // Checkins last 7 days
    const recentCheckins = gymIds.length ? await this.prisma.checkin.groupBy({
      by: ["gymId"],
      where: { gymId: { in: gymIds }, checkedInAt: { gte: subDays(new Date(), 7) } },
      _count: { id: true },
    }) : [];
    const checkinMap = new Map(recentCheckins.map((r) => [r.gymId, r._count.id]));

    return {
      data: gyms.map((gym) => ({
        ...gym,
        memberCount: gym._count.members,
        staffCount: gym._count.staffUsers,
        weeklyCheckins: checkinMap.get(gym.id) ?? 0,
        healthScore: this.computeHealthScore(checkinMap.get(gym.id) ?? 0, gym._count.members),
      })),
      meta: { page, limit, total },
    };
  }

  async getGymDetail(gymId: string) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        _count: { select: { members: true, checkins: true, payments: true } },
      },
    });
    if (!gym) throw new NotFoundException("Gym not found");

    const [revenueThisMonth, activeMembers, recentAudit] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: { gymId, status: "captured", paidAt: { gte: startOfMonth(new Date()) } },
        _sum: { totalPaise: true },
      }),
      this.prisma.member.count({ where: { gymId, status: "active", deletedAt: null } }),
      this.prisma.auditLog.findMany({
        where: { gymId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, actorType: true, action: true, entity: true, createdAt: true },
      }),
    ]);

    return {
      gym,
      revenueThisMonthPaise: revenueThisMonth._sum.totalPaise ?? 0,
      activeMembers,
      recentAudit,
    };
  }

  // ── Impersonation ─────────────────────────────────────────────────────────

  async impersonate(gymId: string, platformUserId: string, dto: ImpersonateDto) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true, name: true },
    });
    if (!gym) throw new NotFoundException("Gym not found");

    // Find the gym owner
    const owner = await this.prisma.staffUser.findFirst({
      where: { gymId, role: "owner", isActive: true },
    });
    if (!owner) throw new NotFoundException("No active owner found for this gym");

    // Log impersonation session
    await this.prisma.$executeRaw`
      INSERT INTO impersonation_sessions (id, platform_user_id, gym_id, reason, started_at, actions_taken)
      VALUES (gen_random_uuid(), ${platformUserId}::uuid, ${gymId}::uuid, ${dto.reason}, NOW(), '[]'::jsonb)
    `;

    this.logger.warn(`IMPERSONATION: platform user ${platformUserId} → gym ${gymId} (${gym.name})`);

    // Issue a short-lived staff JWT (15min) in the gym's context
    const secret = this.config.get("jwt.accessSecret", { infer: true });
    const token = this.jwtService.sign(
      {
        sub: owner.id,
        gymId,
        role: "owner",
        branchId: null,
        type: "staff",
        impersonatedBy: platformUserId,
      },
      { secret, expiresIn: "15m" },
    );

    return {
      token,
      gymName: gym.name,
      expiresIn: 900, // 15 minutes in seconds
      warning: "This impersonation session expires in 15 minutes. All actions are logged.",
    };
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  async getAuditLog(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.gymId && { gymId: query.gymId }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.action && { action: query.action as never }),
      ...(query.entity && { entity: query.entity }),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from && { gte: new Date(query.from) }), ...(query.to && { lte: new Date(query.to) }) } }
        : {}),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { gym: { select: { name: true, slug: true } } },
      }),
    ]);

    return { data: logs, meta: { page, limit, total } };
  }

  // ── Onboarding pipeline ───────────────────────────────────────────────────

  async getOnboardingPipeline() {
    const trials = await this.prisma.gym.findMany({
      where: { status: "trial" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, createdAt: true, trialEndsAt: true,
        _count: { select: { members: true, checkins: true, payments: true } },
      },
    });

    return trials.map((gym) => {
      const daysLeft = gym.trialEndsAt
        ? Math.max(0, Math.ceil((gym.trialEndsAt.getTime() - Date.now()) / 86400000))
        : null;

      // Setup checklist
      const checklist = {
        hasMembers: gym._count.members > 0,
        hasCheckins: gym._count.checkins > 0,
        hasPayments: gym._count.payments > 0,
      };
      const completedSteps = Object.values(checklist).filter(Boolean).length;

      return { ...gym, daysLeft, checklist, completedSteps, totalSteps: 3 };
    });
  }

  // ── Platform stats ────────────────────────────────────────────────────────

  private computeHealthScore(weeklyCheckins: number, memberCount: number): number {
    if (!memberCount) return 0;
    const frequency = weeklyCheckins / memberCount;
    // 3+ visits/week per member = 100, 0 = 0
    return Math.min(100, Math.round((frequency / 3) * 100));
  }
}
