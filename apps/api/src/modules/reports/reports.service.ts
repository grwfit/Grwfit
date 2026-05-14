import { Injectable, Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { subDays, startOfMonth, startOfQuarter, startOfYear, startOfDay, endOfDay } from "date-fns";
import type { ReportsFilterDto, AttendanceReportDto, DatePreset } from "./dto/reports.dto";

// IST = UTC+5:30. DB stores UTC; SQL queries convert with AT TIME ZONE 'Asia/Kolkata'.
// For JS date boundaries, shift by 5h30m so "today" aligns with IST.
function nowIst(): Date {
  const now = new Date();
  const offsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offsetMs);
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly prisma = getPrismaClient();

  // ── Date range resolution ─────────────────────────────────────────────────

  private resolveRange(preset: DatePreset = "30d", from?: string, to?: string): { from: Date; to: Date } {
    const now = nowIst();
    if (preset === "custom" && from && to) {
      return { from: new Date(from), to: new Date(to) };
    }
    const map: Record<DatePreset, () => { from: Date; to: Date }> = {
      today:  () => ({ from: startOfDay(now), to: endOfDay(now) }),
      "7d":   () => ({ from: subDays(now, 6), to: endOfDay(now) }),
      "30d":  () => ({ from: subDays(now, 29), to: endOfDay(now) }),
      mtd:    () => ({ from: startOfMonth(now), to: endOfDay(now) }),
      qtd:    () => ({ from: startOfQuarter(now), to: endOfDay(now) }),
      ytd:    () => ({ from: startOfYear(now), to: endOfDay(now) }),
      custom: () => ({ from: subDays(now, 29), to: endOfDay(now) }),
    };
    return map[preset]();
  }

  private prevRange(from: Date, to: Date): { from: Date; to: Date } {
    const ms = to.getTime() - from.getTime();
    return { from: new Date(from.getTime() - ms), to: from };
  }

  // ── Revenue Reports ───────────────────────────────────────────────────────

  async getRevenueReport(gymId: string, query: ReportsFilterDto) {
    const { from, to } = this.resolveRange(query.preset, query.from, query.to);
    const branchWhere = query.branchId ? { member: { branchId: query.branchId } } : {};

    const [current, prev, byPlan, byMode, dailySeries] = await this.prisma.$transaction([
      // Current period total
      this.prisma.payment.aggregate({
        where: { gymId, status: "captured", paidAt: { gte: from, lte: to }, ...branchWhere },
        _sum: { totalPaise: true },
        _count: { id: true },
      }),
      // Previous period for comparison
      this.prisma.payment.aggregate({
        where: { gymId, status: "captured", ...this.prevRange(from, to), ...branchWhere },
        _sum: { totalPaise: true },
        _count: { id: true },
      }),
      // Breakdown by plan
      this.prisma.payment.groupBy({
        by: ["planId"],
        where: { gymId, status: "captured", paidAt: { gte: from, lte: to } },
        _sum: { totalPaise: true },
        _count: { id: true },
        orderBy: { _sum: { totalPaise: "desc" } },
        take: 10,
      }),
      // Breakdown by payment mode
      this.prisma.payment.groupBy({
        by: ["mode"],
        where: { gymId, status: "captured", paidAt: { gte: from, lte: to } },
        _sum: { totalPaise: true },
        _count: { id: true },
        orderBy: { _sum: { totalPaise: "desc" } },
      }),
      // Daily series for line chart
      this.prisma.$queryRaw<Array<{ date: string; total: bigint; count: bigint }>>`
        SELECT
          date_trunc('day', paid_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date,
          COALESCE(SUM(total_paise), 0) AS total,
          COUNT(*) AS count
        FROM payments
        WHERE gym_id = ${gymId}::uuid
          AND status = 'captured'
          AND paid_at BETWEEN ${from} AND ${to}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    // Resolve plan names
    const planIds = byPlan.map((r) => r.planId).filter(Boolean) as string[];
    const plans = planIds.length
      ? await this.prisma.membershipPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p.name]));

    const prevTotal = prev._sum.totalPaise ?? 0;
    const curTotal = current._sum.totalPaise ?? 0;
    const growth = prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;

    return {
      totalPaise: curTotal,
      totalCount: current._count.id,
      prevTotalPaise: prevTotal,
      growth,
      dailySeries: dailySeries.map((r) => ({
        date: r.date,
        totalPaise: Number(r.total),
        count: Number(r.count),
      })),
      byPlan: byPlan.map((r) => ({
        planId: r.planId,
        planName: r.planId ? (planMap.get(r.planId) ?? "Unknown Plan") : "No Plan",
        totalPaise: (r._sum as Record<string, number | null>)["totalPaise"] ?? 0,
        count: (r._count as Record<string, number>)["id"] ?? 0,
      })),
      byMode: byMode.map((r) => ({
        mode: r.mode,
        totalPaise: (r._sum as Record<string, number | null>)["totalPaise"] ?? 0,
        count: (r._count as Record<string, number>)["id"] ?? 0,
      })),
    };
  }

  // ── Member Reports ────────────────────────────────────────────────────────

  async getMemberReport(gymId: string, query: ReportsFilterDto) {
    const { from, to } = this.resolveRange(query.preset, query.from, query.to);
    const branchFilter = query.branchId ? { branchId: query.branchId } : {};

    const [statusCounts, newSignups, churnedCount, demographics, signupSeries] = await this.prisma.$transaction([
      // Status breakdown
      this.prisma.member.groupBy({
        by: ["status"],
        where: { gymId, deletedAt: null, ...branchFilter },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      // New signups in period
      this.prisma.member.count({
        where: { gymId, deletedAt: null, joinedAt: { gte: from, lte: to }, ...branchFilter },
      }),
      // Churned (expired without renewing in period)
      this.prisma.member.count({
        where: { gymId, deletedAt: null, status: "expired", expiresAt: { gte: from, lte: to }, ...branchFilter },
      }),
      // Gender breakdown
      this.prisma.member.groupBy({
        by: ["gender"],
        where: { gymId, deletedAt: null, ...branchFilter },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      // Daily new signups series
      this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          date_trunc('day', joined_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date,
          COUNT(*) AS count
        FROM members
        WHERE gym_id = ${gymId}::uuid
          AND deleted_at IS NULL
          AND joined_at BETWEEN ${from} AND ${to}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    const getCount = (r: { _count?: unknown }) => ((r._count as Record<string, number>)?.["id"] ?? 0);
    const totalActive = statusCounts.find((r) => r.status === "active") ? getCount(statusCounts.find((r) => r.status === "active")!) : 0;
    const total = statusCounts.reduce((s, r) => s + getCount(r), 0);

    return {
      total,
      statusBreakdown: statusCounts.map((r) => ({ status: r.status, count: getCount(r) })),
      newSignups,
      churnedCount,
      churnRate: totalActive > 0 ? Math.round((churnedCount / totalActive) * 100) : 0,
      genderBreakdown: demographics.map((r) => ({ gender: r.gender ?? "unknown", count: getCount(r) })),
      signupSeries: signupSeries.map((r) => ({ date: r.date, count: Number(r.count) })),
    };
  }

  // ── Cohort Retention ──────────────────────────────────────────────────────

  async getCohortRetention(gymId: string, months = 6) {
    const rows = await this.prisma.$queryRaw<Array<{
      cohort_month: string;
      period_month: number;
      count: bigint;
    }>>`
      WITH cohorts AS (
        SELECT
          id,
          date_trunc('month', joined_at)::date AS cohort_month
        FROM members
        WHERE gym_id = ${gymId}::uuid
          AND deleted_at IS NULL
          AND joined_at >= NOW() - (${months} || ' months')::interval
      ),
      activity AS (
        SELECT DISTINCT
          c.cohort_month,
          c.id,
          EXTRACT(MONTH FROM AGE(p.paid_at, c.cohort_month))::int AS period_month
        FROM cohorts c
        JOIN payments p ON p.member_id = c.id AND p.status = 'captured'
        WHERE p.gym_id = ${gymId}::uuid
      )
      SELECT
        cohort_month::text,
        period_month,
        COUNT(DISTINCT id) AS count
      FROM activity
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    return rows.map((r) => ({
      cohortMonth: r.cohort_month,
      periodMonth: r.period_month,
      count: Number(r.count),
    }));
  }

  // ── Attendance Reports ────────────────────────────────────────────────────

  async getAttendanceReport(gymId: string, query: AttendanceReportDto) {
    const { from, to } = this.resolveRange(query.preset, query.from, query.to);
    const trainerFilter = query.trainerId
      ? { member: { assignedTrainerId: query.trainerId } }
      : {};

    const [dailySeries, heatmap, topMembers, noShows] = await this.prisma.$transaction([
      // Daily check-in count
      this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          date_trunc('day', checked_in_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date,
          COUNT(*) AS count
        FROM checkins
        WHERE gym_id = ${gymId}::uuid
          AND checked_in_at BETWEEN ${from} AND ${to}
        GROUP BY 1
        ORDER BY 1
      `,
      // Peak hour heatmap (day_of_week × hour)
      this.prisma.$queryRaw<Array<{ dow: number; hour: number; count: bigint }>>`
        SELECT
          EXTRACT(DOW FROM checked_in_at AT TIME ZONE 'Asia/Kolkata')::int AS dow,
          EXTRACT(HOUR FROM checked_in_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
          COUNT(*) AS count
        FROM checkins
        WHERE gym_id = ${gymId}::uuid
          AND checked_in_at BETWEEN ${from} AND ${to}
        GROUP BY 1, 2
        ORDER BY 1, 2
      `,
      // Top checking-in members
      this.prisma.checkin.groupBy({
        by: ["memberId"],
        where: { gymId, checkedInAt: { gte: from, lte: to } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Members with no check-in in last 14 days (at-risk)
      this.prisma.member.findMany({
        where: {
          gymId,
          deletedAt: null,
          status: "active",
          ...trainerFilter,
          NOT: {
            checkins: {
              some: { checkedInAt: { gte: subDays(new Date(), 14) } },
            },
          },
        },
        select: { id: true, name: true, phone: true, expiresAt: true, assignedTrainerId: true },
        take: 50,
      }),
    ]);

    // Resolve top member names
    const memberIds = topMembers.map((r) => r.memberId);
    const members = memberIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, name: true },
        })
      : [];
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    return {
      dailySeries: dailySeries.map((r) => ({ date: r.date, count: Number(r.count) })),
      heatmap: heatmap.map((r) => ({ dow: r.dow, hour: r.hour, count: Number(r.count) })),
      topMembers: topMembers.map((r) => ({
        memberId: r.memberId,
        name: memberMap.get(r.memberId) ?? "Unknown",
        count: (r._count as Record<string, number>)?.["id"] ?? 0,
      })),
      atRisk: noShows,
    };
  }

  // ── Trainer Performance ───────────────────────────────────────────────────

  async getTrainerPerformance(gymId: string, query: ReportsFilterDto) {
    const { from, to } = this.resolveRange(query.preset, query.from, query.to);

    const trainers = await this.prisma.staffUser.findMany({
      where: { gymId, role: "trainer", isActive: true },
      select: { id: true, name: true, commissionPct: true },
    });

    const [memberCounts, commissions] = await this.prisma.$transaction([
      this.prisma.member.groupBy({
        by: ["assignedTrainerId"],
        where: { gymId, deletedAt: null, assignedTrainerId: { in: trainers.map((t) => t.id) } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      this.prisma.commission.groupBy({
        by: ["trainerId"],
        where: { gymId, trainerId: { in: trainers.map((t) => t.id) }, createdAt: { gte: from, lte: to } },
        _sum: { amountPaise: true },
        _count: { id: true },
        orderBy: { _sum: { amountPaise: "desc" } },
      }),
    ]);

    const getC = (r: { _count?: unknown }) => ((r._count as Record<string, number>)?.["id"] ?? 0);
    const getS = (r: { _sum?: unknown }) => ((r._sum as Record<string, number | null>)?.["amountPaise"] ?? 0);
    const memberCountMap = new Map(memberCounts.map((r) => [r.assignedTrainerId!, getC(r)]));
    const commissionMap = new Map(commissions.map((r) => [r.trainerId, getS(r)]));

    return trainers.map((t) => ({
      id: t.id,
      name: t.name,
      commissionPct: t.commissionPct ? Number(t.commissionPct) : 0,
      memberCount: memberCountMap.get(t.id) ?? 0,
      commissionPaise: commissionMap.get(t.id) ?? 0,
    }));
  }

  // ── GST Summary (for CA export) ───────────────────────────────────────────

  async getGstSummary(gymId: string, query: ReportsFilterDto) {
    const { from, to } = this.resolveRange(query.preset, query.from, query.to);

    const rows = await this.prisma.payment.findMany({
      where: { gymId, status: "captured", paidAt: { gte: from, lte: to } },
      select: {
        invoiceNumber: true, paidAt: true,
        amountPaise: true, gstPct: true, gstAmountPaise: true, totalPaise: true,
        mode: true,
        member: { select: { name: true, phone: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    const totals = rows.reduce(
      (acc, r) => ({
        base: acc.base + r.amountPaise,
        gst: acc.gst + r.gstAmountPaise,
        total: acc.total + r.totalPaise,
      }),
      { base: 0, gst: 0, total: 0 },
    );

    return { rows, totals };
  }
}
