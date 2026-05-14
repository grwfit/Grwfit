import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { getPrismaClient } from "@grwfit/db";
import { MemberCacheService } from "./services/member-cache.service";
import { WhatsAppService } from "../auth/services/whatsapp.service";
import { WhatsAppModuleService } from "../whatsapp/whatsapp.service";
import type { CreateCheckinDto, UpdateCheckinSettingsDto } from "./dto/create-checkin.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { differenceInDays } from "date-fns";

export const CHECKIN_WRITE_QUEUE = "checkin-write";

export interface CheckinResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  memberId: string;
  name: string;
  photoUrl: string | null;
  status: string;
  expiresAt: string | null;
  daysLeft: number | null;
  message: string;
  warningLevel: "ok" | "warn" | "block";
  checkedInAt: string;
}

@Injectable()
export class CheckinsService {
  private readonly logger = new Logger(CheckinsService.name);

  constructor(
    private readonly cache: MemberCacheService,
    private readonly whatsApp: WhatsAppService,
    private readonly whatsAppModule: WhatsAppModuleService,
    @InjectQueue(CHECKIN_WRITE_QUEUE) private readonly writeQueue: Queue,
  ) {}

  // ── HOT PATH: must complete < 200ms ────────────────────────────────────────

  async checkin(gymId: string, dto: CreateCheckinDto, req: AuthenticatedRequest): Promise<CheckinResult> {
    if (!dto.memberId && !dto.qrCode) {
      throw new BadRequestException("Provide either memberId or qrCode");
    }
    if (dto.method === "biometric") {
      throw new ForbiddenException("Biometric check-in requires Pro tier");
    }

    // 1. Lookup from Redis cache (< 2ms on hit, < 20ms on miss)
    const member = dto.qrCode
      ? await this.cache.getMemberByQr(gymId, dto.qrCode)
      : await this.cache.getMemberById(gymId, dto.memberId!);

    if (!member) throw new NotFoundException("Member not found");

    // 2. Load settings from cache
    const settings = await this.cache.getSettings(gymId);

    // 3. Validate status
    if (member.status === "frozen") {
      return {
        success: false,
        memberId: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        status: member.status,
        expiresAt: member.expiresAt,
        daysLeft: null,
        message: "Membership is frozen",
        warningLevel: "block",
        checkedInAt: new Date().toISOString(),
      };
    }

    const daysLeft = member.expiresAt
      ? differenceInDays(new Date(member.expiresAt), new Date())
      : null;

    if (member.status === "expired" && !settings.allowExpired) {
      return {
        success: false,
        memberId: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        status: member.status,
        expiresAt: member.expiresAt,
        daysLeft,
        message: "Membership has expired. Please renew to check in.",
        warningLevel: "block",
        checkedInAt: new Date().toISOString(),
      };
    }

    // 4. Dedup check (30-min window) — Redis SETNX, non-blocking
    const duplicate = await this.cache.isDuplicate(gymId, member.id);
    if (duplicate) {
      return {
        success: true,
        alreadyCheckedIn: true,
        memberId: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        status: member.status,
        expiresAt: member.expiresAt,
        daysLeft,
        message: `Already checked in today, ${member.name.split(" ")[0]}!`,
        warningLevel: "ok",
        checkedInAt: new Date().toISOString(),
      };
    }

    // 5. Build response message
    const message = this.buildMessage(member.name, member.status, daysLeft);
    const warningLevel = member.status === "expired" ? "warn" : daysLeft !== null && daysLeft <= 3 ? "warn" : "ok";

    const checkedInAt = new Date().toISOString();

    // 6. Async DB write — fire and forget (never awaited)
    void this.writeQueue
      .add(
        {
          gymId,
          memberId: member.id,
          branchId: member.branchId,
          method: dto.method,
          deviceId: dto.deviceId ?? null,
          createdBy: req.userId ?? null,
          checkedInAt,
        },
        { attempts: 5, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: 100 },
      )
      .catch((err) => this.logger.error("Failed to queue checkin write", err));

    // 7. Increment today's count in Redis (non-blocking)
    void this.cache.incrementTodayCount(gymId).catch(() => null);

    // 8. WhatsApp notification via trigger rule (configurable per gym, non-blocking)
    void this.whatsAppModule.fireTrigger(gymId, "checkin", member.id, {
      name: member.name.split(" ")[0]!,
    }).catch(() => null);

    return {
      success: true,
      memberId: member.id,
      name: member.name,
      photoUrl: member.photoUrl,
      status: member.status,
      expiresAt: member.expiresAt,
      daysLeft,
      message,
      warningLevel,
      checkedInAt,
    };
  }

  // ── REPORTS ─────────────────────────────────────────────────────────────────

  async getToday(gymId: string) {
    const prisma = getPrismaClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [checkins, todayCount] = await Promise.all([
      prisma.checkin.findMany({
        where: { gymId, checkedInAt: { gte: startOfDay } },
        include: {
          member: { select: { id: true, name: true, photoUrl: true, phone: true } },
        },
        orderBy: { checkedInAt: "desc" },
        take: 50,
      }),
      this.cache.getTodayCount(gymId),
    ]);

    return {
      checkins,
      total: todayCount || checkins.length,
      peakHour: this.predictPeakHour(checkins.map((c) => c.checkedInAt)),
    };
  }

  async getHeatmap(gymId: string, days: number = 7) {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await prisma.$queryRaw<Array<{ hour: number; dow: number; count: bigint }>>`
      SELECT
        EXTRACT(HOUR FROM checked_in_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
        EXTRACT(DOW  FROM checked_in_at AT TIME ZONE 'Asia/Kolkata')::int AS dow,
        COUNT(*)::int AS count
      FROM checkins
      WHERE gym_id = ${gymId}::uuid
        AND checked_in_at >= ${since}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    // Build 7×24 grid
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const row of rows) {
      grid[row.dow]![row.hour] = Number(row.count);
    }

    return { grid, days };
  }

  async getMemberHistory(gymId: string, memberId: string, limit = 30) {
    const prisma = getPrismaClient();
    return prisma.checkin.findMany({
      where: { gymId, memberId },
      orderBy: { checkedInAt: "desc" },
      take: limit,
      select: { id: true, checkedInAt: true, method: true, branchId: true },
    });
  }

  async getNoShows(gymId: string, days: number = 14) {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Members who have NOT checked in within the last `days` days
    // but are active (not expired/frozen)
    const atRisk = await prisma.$queryRaw<
      Array<{ id: string; name: string; phone: string; last_checkin: Date | null; days_absent: number }>
    >`
      SELECT
        m.id,
        m.name,
        m.phone,
        MAX(c.checked_in_at) AS last_checkin,
        COALESCE(
          EXTRACT(DAY FROM NOW() - MAX(c.checked_in_at))::int,
          ${days}
        ) AS days_absent
      FROM members m
      LEFT JOIN checkins c ON c.member_id = m.id AND c.gym_id = m.gym_id
      WHERE m.gym_id     = ${gymId}::uuid
        AND m.status     IN ('active', 'trial')
        AND m.deleted_at IS NULL
      GROUP BY m.id, m.name, m.phone
      HAVING MAX(c.checked_in_at) < ${since} OR MAX(c.checked_in_at) IS NULL
      ORDER BY days_absent DESC
      LIMIT 100
    `;

    return atRisk;
  }

  async getLiveTicker(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.checkin.findMany({
      where: { gymId },
      include: { member: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { checkedInAt: "desc" },
      take: 10,
    });
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────────

  async updateSettings(gymId: string, dto: UpdateCheckinSettingsDto) {
    const prisma = getPrismaClient();
    const settings = await prisma.gymCheckinSettings.upsert({
      where: { gymId },
      create: {
        gymId,
        allowExpired: dto.allowExpired ?? true,
        notifyWhatsApp: dto.notifyWhatsApp ?? false,
        notifyMessage: dto.notifyMessage ?? null,
      },
      update: {
        ...(dto.allowExpired !== undefined && { allowExpired: dto.allowExpired }),
        ...(dto.notifyWhatsApp !== undefined && { notifyWhatsApp: dto.notifyWhatsApp }),
        ...(dto.notifyMessage !== undefined && { notifyMessage: dto.notifyMessage }),
      },
    });

    await this.cache.invalidateSettings(gymId);
    return settings;
  }

  async getSettings(gymId: string) {
    return this.cache.getSettings(gymId);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  private buildMessage(name: string, status: string, daysLeft: number | null): string {
    const first = name.split(" ")[0]!;
    if (status === "expired") return `${first}, please renew your membership!`;
    if (daysLeft !== null && daysLeft <= 1) return `${first}, your membership expires tomorrow!`;
    if (daysLeft !== null && daysLeft <= 3) return `${first}, membership expires in ${daysLeft} days`;
    if (daysLeft !== null && daysLeft <= 7) return `${first}, ${daysLeft} days left on your plan`;
    return `Welcome back, ${first}! 💪`;
  }

  private predictPeakHour(timestamps: Date[]): number | null {
    if (timestamps.length === 0) return null;
    const counts: Record<number, number> = {};
    for (const t of timestamps) {
      const h = t.getHours();
      counts[h] = (counts[h] ?? 0) + 1;
    }
    return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a), ["0", 0])[0] as unknown as number;
  }
}
