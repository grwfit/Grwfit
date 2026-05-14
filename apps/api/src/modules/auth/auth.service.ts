import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { OtpService } from "./services/otp.service";
import { TokenService } from "./services/token.service";
import type { RequestOtpDto } from "./dto/request-otp.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { SelectGymDto } from "./dto/select-gym.dto";

export interface GymOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    role?: string;
    type: "staff" | "member";
  };
  gymId: string | null;
  gyms?: GymOption[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  async requestOtp(dto: RequestOtpDto, ip?: string): Promise<{ sent: boolean; channel: string }> {
    const prisma = getPrismaClient();

    // Validate the email belongs to a known user — but don't reveal if it doesn't
    if (dto.userType === "staff") {
      const exists = await prisma.staffUser.findFirst({
        where: { email: dto.email, isActive: true },
      });
      if (!exists) {
        this.logger.warn(`OTP requested for unknown staff email: ${dto.email}`);
        return { sent: true, channel: "email" }; // security: don't reveal non-existence
      }
    } else {
      const exists = await prisma.member.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (!exists) {
        this.logger.warn(`OTP requested for unknown member email: ${dto.email}`);
        return { sent: true, channel: "email" };
      }
    }

    await this.otpService.requestOtp(dto.email);

    await prisma.loginHistory.create({
      data: {
        userId: "00000000-0000-0000-0000-000000000000",
        userType: dto.userType,
        ip: ip ?? null,
        success: false,
      },
    });

    return { sent: true, channel: "email" };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    await this.otpService.verifyOtp(dto.email, dto.otp);

    if (dto.userType === "staff") {
      return this.loginStaff(dto.email, ip, userAgent);
    } else {
      return this.loginMember(dto.email, ip, userAgent);
    }
  }

  async selectGym(
    preSelectToken: string,
    dto: SelectGymDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const prisma = getPrismaClient();

    const payload = this.tokenService.verifyPreSelectToken(preSelectToken);

    const staffUser = await prisma.staffUser.findFirst({
      where: { id: payload.userId, gymId: dto.gymId, isActive: true },
      include: { gym: true },
    });

    if (!staffUser) throw new ForbiddenException("You do not have access to this gym");

    const accessToken = this.tokenService.issueStaffToken({
      userId: staffUser.id,
      gymId: staffUser.gymId,
      role: staffUser.role,
      branchId: staffUser.branchId,
      type: "staff",
    });

    const refreshToken = await this.tokenService.issueRefreshToken(
      staffUser.id, "staff", staffUser.gymId,
    );

    await prisma.staffUser.update({ where: { id: staffUser.id }, data: { lastLoginAt: new Date() } });
    await this.writeLoginHistory(staffUser.id, "staff", staffUser.gymId, true, ip, userAgent);
    await this.writeAuditLog(staffUser.id, "staff", staffUser.gymId, "login");

    return {
      accessToken,
      refreshToken,
      user: { id: staffUser.id, name: staffUser.name, email: staffUser.email, role: staffUser.role, type: "staff" },
      gymId: staffUser.gymId,
    };
  }

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const rotated = await this.tokenService.rotateRefreshToken(rawRefreshToken);

    let accessToken: string;
    if (rotated.userType === "staff" && rotated.staff) {
      const prisma = getPrismaClient();
      const staffUser = await prisma.staffUser.findUnique({
        where: { id: rotated.userId },
        select: { role: true, branchId: true },
      });
      if (!staffUser) throw new UnauthorizedException("User not found");
      accessToken = this.tokenService.issueStaffToken({
        userId: rotated.userId,
        gymId: rotated.gymId!,
        role: staffUser.role,
        branchId: staffUser.branchId,
        type: "staff",
      });
    } else {
      accessToken = this.tokenService.issueMemberToken({
        userId: rotated.userId,
        gymId: rotated.gymId!,
        type: "member",
      });
    }

    return { accessToken, refreshToken: rotated.newRefreshToken };
  }

  async logout(rawRefreshToken: string | undefined, userId: string): Promise<void> {
    if (rawRefreshToken) await this.tokenService.revokeRefreshToken(rawRefreshToken);
    await this.writeAuditLog(userId, "staff", undefined, "logout");
  }

  async getMe(userId: string, userType: "staff" | "member", gymId?: string) {
    const prisma = getPrismaClient();

    if (userType === "staff") {
      const user = await prisma.staffUser.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, role: true, gymId: true, branchId: true, isActive: true },
      });
      if (!user || !user.isActive) throw new UnauthorizedException("Account not found or inactive");
      return { ...user, type: "staff" as const };
    }

    const user = await prisma.member.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, email: true, gymId: true, status: true },
    });
    if (!user) throw new UnauthorizedException("Account not found");
    return { ...user, type: "member" as const };
  }

  private async loginStaff(email: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    const prisma = getPrismaClient();

    const staffUsers = await prisma.staffUser.findMany({
      where: { email, isActive: true },
      include: { gym: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    if (staffUsers.length === 0) {
      throw new UnauthorizedException("No active staff account found for this email");
    }

    if (staffUsers.length === 1) {
      const s = staffUsers[0]!;
      const accessToken = this.tokenService.issueStaffToken({
        userId: s.id, gymId: s.gymId, role: s.role, branchId: s.branchId, type: "staff",
      });
      const refreshToken = await this.tokenService.issueRefreshToken(s.id, "staff", s.gymId);

      await prisma.staffUser.update({ where: { id: s.id }, data: { lastLoginAt: new Date() } });
      await this.writeLoginHistory(s.id, "staff", s.gymId, true, ip, userAgent);
      await this.writeAuditLog(s.id, "staff", s.gymId, "login");

      return {
        accessToken, refreshToken,
        user: { id: s.id, name: s.name, email: s.email, role: s.role, type: "staff" },
        gymId: s.gymId,
      };
    }

    // Multiple gyms — return gym picker
    const primary = staffUsers[0]!;
    const accessToken = this.tokenService.issueStaffPreSelectToken(primary.id);
    const gyms: GymOption[] = staffUsers.map((s) => ({
      id: s.gym.id, name: s.gym.name, slug: s.gym.slug, logoUrl: s.gym.logoUrl,
    }));

    return {
      accessToken, refreshToken: "",
      user: { id: primary.id, name: primary.name, email: primary.email, type: "staff" },
      gymId: null, gyms,
    };
  }

  private async loginMember(email: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    const prisma = getPrismaClient();

    const member = await prisma.member.findFirst({
      where: { email, deletedAt: null },
    });

    if (!member) throw new UnauthorizedException("No member account found for this email");

    const accessToken = this.tokenService.issueMemberToken({
      userId: member.id, gymId: member.gymId, type: "member",
    });
    const refreshToken = await this.tokenService.issueRefreshToken(member.id, "member", member.gymId);

    await this.writeLoginHistory(member.id, "member", member.gymId, true, ip, userAgent);
    await this.writeAuditLog(member.id, "member", member.gymId, "login");

    return {
      accessToken, refreshToken,
      user: { id: member.id, name: member.name, email: member.email, type: "member" },
      gymId: member.gymId,
    };
  }

  private async writeLoginHistory(
    userId: string, userType: "staff" | "member", gymId: string | undefined,
    success: boolean, ip?: string, userAgent?: string,
  ) {
    const prisma = getPrismaClient();
    await prisma.loginHistory.create({
      data: { userId, userType, gymId: gymId ?? null, success, ip: ip ?? null, userAgent: userAgent ?? null },
    });
  }

  private async writeAuditLog(
    actorId: string, actorType: "staff" | "member",
    gymId: string | undefined, action: "login" | "logout",
  ) {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: { actorId, actorType, gymId: gymId ?? null, action, entity: "auth" },
    });
  }
}
