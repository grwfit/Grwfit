import { Injectable, Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { RedisService } from "../../../common/services/redis.service";

const MEMBER_TTL = 300; // 5 min
const SETTINGS_TTL = 600; // 10 min

export interface CachedMember {
  id: string;
  gymId: string;
  branchId: string | null;
  name: string;
  phone: string;
  status: string;
  photoUrl: string | null;
  expiresAt: string | null;
  currentPlanId: string | null;
  assignedTrainerId: string | null;
  qrCode: string;
}

export interface CachedSettings {
  allowExpired: boolean;
  notifyWhatsApp: boolean;
  notifyMessage: string | null;
}

@Injectable()
export class MemberCacheService {
  private readonly logger = new Logger(MemberCacheService.name);

  constructor(private readonly redis: RedisService) {}

  // ── Member lookup ───────────────────────────────────────────────────────────

  async getMemberById(gymId: string, memberId: string): Promise<CachedMember | null> {
    const key = `member:${gymId}:${memberId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as CachedMember;

    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      select: {
        id: true, gymId: true, branchId: true, name: true, phone: true,
        status: true, photoUrl: true, expiresAt: true,
        currentPlanId: true, assignedTrainerId: true, qrCode: true,
      },
    });

    if (!member) return null;

    const cached_member: CachedMember = {
      ...member,
      expiresAt: member.expiresAt?.toISOString() ?? null,
    };
    await this.redis.set(key, JSON.stringify(cached_member), MEMBER_TTL);
    return cached_member;
  }

  async getMemberByQr(gymId: string, qrCode: string): Promise<CachedMember | null> {
    // QR codes are `GRW-{UUID_UPPERCASE}` — extract the UUID
    const memberIdFromQr = this.extractMemberIdFromQr(qrCode);
    if (memberIdFromQr) {
      return this.getMemberById(gymId, memberIdFromQr);
    }

    // Fallback: DB lookup by qrCode field (handles legacy/custom QR codes)
    const key = `qr:${gymId}:${qrCode}`;
    const cachedId = await this.redis.get(key);
    if (cachedId) return this.getMemberById(gymId, cachedId);

    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({
      where: { gymId, qrCode, deletedAt: null },
      select: { id: true },
    });
    if (!member) return null;

    await this.redis.set(key, member.id, MEMBER_TTL);
    return this.getMemberById(gymId, member.id);
  }

  invalidate(gymId: string, memberId: string): Promise<void> {
    return this.redis.del(`member:${gymId}:${memberId}`);
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  async getSettings(gymId: string): Promise<CachedSettings> {
    const key = `checkin_settings:${gymId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as CachedSettings;

    const prisma = getPrismaClient();
    const settings = await prisma.gymCheckinSettings.findUnique({ where: { gymId } });

    const result: CachedSettings = {
      allowExpired: settings?.allowExpired ?? true,
      notifyWhatsApp: settings?.notifyWhatsApp ?? false,
      notifyMessage: settings?.notifyMessage ?? null,
    };

    await this.redis.set(key, JSON.stringify(result), SETTINGS_TTL);
    return result;
  }

  invalidateSettings(gymId: string): Promise<void> {
    return this.redis.del(`checkin_settings:${gymId}`);
  }

  // ── Dedup ───────────────────────────────────────────────────────────────────

  /** Returns true if this is a duplicate (already checked in within 30 min) */
  async isDuplicate(gymId: string, memberId: string): Promise<boolean> {
    const key = `checkin_dedup:${gymId}:${memberId}`;
    const acquired = await this.redis.setNx(key, "1", 30 * 60); // 30 min TTL
    return !acquired; // if setNx failed (key exists) → duplicate
  }

  // ── Today's count ────────────────────────────────────────────────────────────

  async incrementTodayCount(gymId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0]!;
    const key = `checkin_count:${gymId}:${today}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 86400 + 3600); // 25h TTL
    }
    return count;
  }

  async getTodayCount(gymId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0]!;
    const val = await this.redis.get(`checkin_count:${gymId}:${today}`);
    return val ? parseInt(val, 10) : 0;
  }

  private extractMemberIdFromQr(qrCode: string): string | null {
    // Format: GRW-{UUID_UPPERCASE}
    const match = /^GRW-([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})$/i.exec(qrCode);
    if (!match) return null;
    return match[1]!.toLowerCase();
  }
}
