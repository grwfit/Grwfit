import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { getPrismaClient } from "@grwfit/db";
import type { StaffRole, UserType } from "@grwfit/db";
import type { AppConfig } from "../../../config/configuration";

const REFRESH_EXPIRY_DAYS = 30;

export interface StaffJwt {
  sub: string;
  userId: string;
  gymId: string;
  role: StaffRole;
  branchId: string | null;
  type: "staff";
}

export interface StaffPreSelectJwt {
  sub: string;
  userId: string;
  type: "staff_pre_select";
}

export interface MemberJwt {
  sub: string;
  userId: string;
  gymId: string;
  type: "member";
}

export interface PlatformJwt {
  sub: string;
  userId: string;
  platformRole: string;
  type: "platform";
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  issueStaffToken(payload: Omit<StaffJwt, "sub">): string {
    const secret = this.configService.get("jwt.accessSecret", { infer: true });
    const expiresIn = this.configService.get("jwt.accessExpiresIn", { infer: true });
    return this.jwtService.sign(
      { ...payload, sub: payload.userId },
      { secret, expiresIn },
    );
  }

  issueStaffPreSelectToken(userId: string): string {
    const secret = this.configService.get("jwt.accessSecret", { infer: true });
    return this.jwtService.sign(
      { sub: userId, userId, type: "staff_pre_select" } satisfies StaffPreSelectJwt,
      { secret, expiresIn: "10m" },
    );
  }

  issueMemberToken(payload: Omit<MemberJwt, "sub">): string {
    const secret = this.configService.get("jwt.accessSecret", { infer: true });
    const expiresIn = this.configService.get("jwt.accessExpiresIn", { infer: true });
    return this.jwtService.sign(
      { ...payload, sub: payload.userId },
      { secret, expiresIn },
    );
  }

  issuePlatformToken(payload: Omit<PlatformJwt, "sub">): string {
    const secret = this.configService.get("jwt.platformSecret", { infer: true });
    return this.jwtService.sign(
      { ...payload, sub: payload.userId },
      { secret, expiresIn: "8h", issuer: "grwfit-platform" },
    );
  }

  async issueRefreshToken(
    userId: string,
    userType: UserType,
    gymId: string | null,
  ): Promise<string> {
    const prisma = getPrismaClient();
    const rawToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        ...(userType === "staff" ? { staffId: userId } : { memberId: userId }),
        userType,
        gymId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{
    userId: string;
    userType: UserType;
    gymId: string | null;
    newRefreshToken: string;
    staff?: { role: StaffRole; branchId: string | null };
  }> {
    const prisma = getPrismaClient();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        staff: { select: { id: true, role: true, branchId: true, isActive: true } },
        member: { select: { id: true, status: true } },
      },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (record.revokedAt) {
      // Token reuse detected — revoke all tokens for this user (account compromise)
      await this.revokeAllUserTokens(
        record.staffId ?? record.memberId ?? "",
        record.userType,
      );
      throw new UnauthorizedException("Refresh token reuse detected. Please login again.");
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired. Please login again.");
    }
    if (record.staff && !record.staff.isActive) {
      throw new UnauthorizedException("Account deactivated");
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const userId = (record.staffId ?? record.memberId)!;
    const newRefreshToken = await this.issueRefreshToken(userId, record.userType, record.gymId);

    return {
      userId,
      userType: record.userType,
      gymId: record.gymId,
      newRefreshToken,
      ...(record.staff && {
        staff: { role: record.staff.role, branchId: record.staff.branchId },
      }),
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const prisma = getPrismaClient();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string, userType: UserType): Promise<void> {
    const prisma = getPrismaClient();
    const where =
      userType === "staff"
        ? { staffId: userId, revokedAt: null }
        : { memberId: userId, revokedAt: null };

    await prisma.refreshToken.updateMany({
      where,
      data: { revokedAt: new Date() },
    });
    this.logger.warn(`All refresh tokens revoked for user ${userId}`);
  }

  verifyPreSelectToken(token: string): StaffPreSelectJwt {
    const secret = this.configService.get("jwt.accessSecret", { infer: true });
    try {
      const payload = this.jwtService.verify<StaffPreSelectJwt>(token, { secret });
      if (payload.type !== "staff_pre_select") {
        throw new UnauthorizedException("Invalid token type");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
