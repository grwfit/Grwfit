import {
  Controller, Get, Post, Body, UseGuards, Req, ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { getPrismaClient } from "@grwfit/db";
import { PlansService } from "../plans/plans.service";
import { ClassesService } from "../classes/classes.service";
import type { LogProgressDto } from "../plans/dto/plans.dto";

@ApiTags("Member Portal")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("members/me")
export class MemberPortalController {
  private readonly prisma = getPrismaClient();

  constructor(
    private readonly plansService: PlansService,
    private readonly classesService: ClassesService,
  ) {}

  private assertMember(req: AuthenticatedRequest) {
    if (req.userType !== "member") throw new ForbiddenException("Member access only");
    return req.userId!;
  }

  @Get()
  @ApiOperation({ summary: "Get own member profile + plan summary" })
  async getMe(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    const gymId = req.gymId!;

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      include: {
        branch: { select: { name: true } },
      },
    });
    if (!member) throw new ForbiddenException("Member not found");

    const plan = member.currentPlanId
      ? await this.prisma.membershipPlan.findUnique({ where: { id: member.currentPlanId } })
      : null;

    // Streak: consecutive days with at least one check-in
    const recentCheckins = await this.prisma.checkin.findMany({
      where: { gymId, memberId },
      orderBy: { checkedInAt: "desc" },
      take: 60,
      select: { checkedInAt: true },
    });

    const streak = this.computeStreak(recentCheckins.map((c) => c.checkedInAt));

    const daysLeft = member.expiresAt
      ? Math.max(0, Math.ceil((member.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      photoUrl: member.photoUrl,
      status: member.status,
      expiresAt: member.expiresAt,
      daysLeft,
      planName: plan?.name ?? null,
      planPricePaise: plan?.pricePaise ?? null,
      branchName: member.branch?.name ?? null,
      streak,
      onboardingCompleted: !!(member.dob || member.goals),
    };
  }

  @Get("workout-plan")
  @ApiOperation({ summary: "Get today's active workout plan" })
  async getWorkoutPlan(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    return this.plansService.getMemberWorkoutPlan(req.gymId!, memberId);
  }

  @Get("diet-plan")
  @ApiOperation({ summary: "Get active diet plan" })
  async getDietPlan(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    return this.plansService.getMemberDietPlan(req.gymId!, memberId);
  }

  @Get("progress")
  @ApiOperation({ summary: "Get own progress logs" })
  async getProgress(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    return this.plansService.getProgressLogs(req.gymId!, memberId, 30);
  }

  @Post("progress")
  @ApiOperation({ summary: "Log own progress (weight, measurements, photos)" })
  async logProgress(@Req() req: AuthenticatedRequest, @Body() dto: Omit<LogProgressDto, "memberId">) {
    const memberId = this.assertMember(req);
    return this.plansService.logProgress(req.gymId!, { ...dto, memberId }, req);
  }

  @Get("payments")
  @ApiOperation({ summary: "Get own payment history" })
  async getPayments(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    return this.prisma.payment.findMany({
      where: { gymId: req.gymId!, memberId, status: "captured" },
      orderBy: { paidAt: "desc" },
      take: 20,
      select: {
        id: true, totalPaise: true, mode: true, status: true,
        invoiceNumber: true, invoicePdfUrl: true, paidAt: true,
        plan: { select: { name: true } },
      },
    });
  }

  @Get("checkins")
  @ApiOperation({ summary: "Get own check-in history + monthly count" })
  async getCheckins(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recent, monthlyCount] = await this.prisma.$transaction([
      this.prisma.checkin.findMany({
        where: { gymId: req.gymId!, memberId, checkedInAt: { gte: thirtyDaysAgo } },
        orderBy: { checkedInAt: "desc" },
        select: { id: true, checkedInAt: true, method: true },
      }),
      this.prisma.checkin.count({
        where: {
          gymId: req.gymId!,
          memberId,
          checkedInAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    return { recent, monthlyCount };
  }

  @Get("classes")
  @ApiOperation({ summary: "Get upcoming class instances available to book" })
  async getClasses(@Req() req: AuthenticatedRequest) {
    this.assertMember(req);
    return this.classesService.listInstances(req.gymId!, {});
  }

  @Post("classes/book")
  @ApiOperation({ summary: "Book a class" })
  async bookClass(@Req() req: AuthenticatedRequest, @Body("instanceId") instanceId: string) {
    const memberId = this.assertMember(req);
    return this.classesService.bookClass(req.gymId!, { instanceId, memberId }, req);
  }

  @Get("classes/my-bookings")
  @ApiOperation({ summary: "Get own class bookings" })
  async getMyBookings(@Req() req: AuthenticatedRequest) {
    const memberId = this.assertMember(req);
    return this.classesService.getMemberBookings(req.gymId!, memberId);
  }

  private computeStreak(dates: Date[]): number {
    if (!dates.length) return 0;
    const days = [...new Set(dates.map((d) => d.toISOString().substring(0, 10)))].sort().reverse();
    const today = new Date().toISOString().substring(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    if (days[0] !== today && days[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]!);
      const curr = new Date(days[i]!);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }
}
