import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { OtpService } from "./services/otp.service";
import { TokenService } from "./services/token.service";
import { WhatsAppService } from "./services/whatsapp.service";
import { SmsService } from "./services/sms.service";
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
    phone: string;
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
    private readonly whatsAppService: WhatsAppService,
    private readonly smsService: SmsService,
  ) {}

  async requestOtp(dto: RequestOtpDto, ip?: string): Promise<{ sent: boolean; channel: string; devOtp?: string }> {
    const prisma = getPrismaClient();

    // Validate the phone belongs to a known user for staff type
    if (dto.userType === "staff") {
      const exists = await prisma.staffUser.findFirst({
        where: { phone: dto.phone, isActive: true },
      });
      if (!exists) {
        // Security: don't reveal whether account exists
        // Still "succeed" to prevent user enumeration
        this.logger.warn(`OTP requested for unknown staff phone: ${dto.phone}`);
        return { sent: true, channel: "whatsapp" };
      }
    }

    const otp = await this.otpService.requestOtp(dto.phone, dto.userType);

    // Send via WhatsApp first, SMS fallback
    const waResult = await this.whatsAppService.sendOtp(dto.phone, otp);
    let channel = "whatsapp";

    if (!waResult.success) {
      const smsSent = await this.smsService.sendOtp(dto.phone, otp);
      channel = smsSent ? "sms" : "failed";

      if (!smsSent) {
        this.logger.error(`Failed to send OTP to ${dto.phone} via WhatsApp AND SMS`);
      }
    }

    // Log OTP request (without the actual OTP)
    await prisma.loginHistory.create({
      data: {
        userId: "00000000-0000-0000-0000-000000000000", // placeholder for OTP request
        userType: dto.userType,
        ip: ip ?? null,
        success: false,
      },
    });

    const devOtp = process.env["NODE_ENV"] !== "production" ? otp : undefined;
    return { sent: true, channel, devOtp };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const prisma = getPrismaClient();

    await this.otpService.verifyOtp(dto.phone, dto.otp, dto.userType);

    if (dto.userType === "staff") {
      return this.loginStaff(dto.phone, ip, userAgent);
    } else {
      return this.loginMember(dto.phone, ip, userAgent);
    }
  }

  async selectGym(
    preSelectToken: string,
    dto: SelectGymDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const prisma = getPrismaClient();

    // Verify the pre-select token
    const payload = this.tokenService.verifyPreSelectToken(preSelectToken);

    // Validate staff belongs to requested gym
    const staffUser = await prisma.staffUser.findFirst({
      where: {
        id: payload.userId,
        gymId: dto.gymId,
        isActive: true,
      },
      include: { gym: true },
    });

    if (!staffUser) {
      throw new ForbiddenException("You do not have access to this gym");
    }

    const accessToken = this.tokenService.issueStaffToken({
      userId: staffUser.id,
      gymId: staffUser.gymId,
      role: staffUser.role,
      branchId: staffUser.branchId,
      type: "staff",
    });

    const refreshToken = await this.tokenService.issueRefreshToken(
      staffUser.id,
      "staff",
      staffUser.gymId,
    );

    await prisma.staffUser.update({
      where: { id: staffUser.id },
      data: { lastLoginAt: new Date() },
    });

    await this.writeLoginHistory(staffUser.id, "staff", staffUser.gymId, true, ip, userAgent);
    await this.writeAuditLog(staffUser.id, "staff", staffUser.gymId, "login");

    return {
      accessToken,
      refreshToken,
      user: {
        id: staffUser.id,
        name: staffUser.name,
        phone: staffUser.phone,
        role: staffUser.role,
        type: "staff",
      },
      gymId: staffUser.gymId,
    };
  }

  async refresh(rawRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
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
    if (rawRefreshToken) {
      await this.tokenService.revokeRefreshToken(rawRefreshToken);
    }
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

  private async loginStaff(phone: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    const prisma = getPrismaClient();

    // Find all active staff records for this phone (may span multiple gyms)
    const staffUsers = await prisma.staffUser.findMany({
      where: { phone, isActive: true },
      include: { gym: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    if (staffUsers.length === 0) {
      throw new UnauthorizedException("No active staff account found for this phone");
    }

    if (staffUsers.length === 1) {
      const staffUser = staffUsers[0]!;
      const accessToken = this.tokenService.issueStaffToken({
        userId: staffUser.id,
        gymId: staffUser.gymId,
        role: staffUser.role,
        branchId: staffUser.branchId,
        type: "staff",
      });
      const refreshToken = await this.tokenService.issueRefreshToken(
        staffUser.id,
        "staff",
        staffUser.gymId,
      );

      await prisma.staffUser.update({
        where: { id: staffUser.id },
        data: { lastLoginAt: new Date() },
      });
      await this.writeLoginHistory(staffUser.id, "staff", staffUser.gymId, true, ip, userAgent);
      await this.writeAuditLog(staffUser.id, "staff", staffUser.gymId, "login");

      return {
        accessToken,
        refreshToken,
        user: { id: staffUser.id, name: staffUser.name, phone: staffUser.phone, role: staffUser.role, type: "staff" },
        gymId: staffUser.gymId,
      };
    }

    // Multiple gyms — issue pre-select token, return gym list
    // Use the first staff record's userId as the pre-select identity
    const primaryStaff = staffUsers[0]!;
    const accessToken = this.tokenService.issueStaffPreSelectToken(primaryStaff.id);

    const gyms: GymOption[] = staffUsers.map((s) => ({
      id: s.gym.id,
      name: s.gym.name,
      slug: s.gym.slug,
      logoUrl: s.gym.logoUrl,
    }));

    return {
      accessToken,
      refreshToken: "", // No refresh token until gym is selected
      user: { id: primaryStaff.id, name: primaryStaff.name, phone: primaryStaff.phone, type: "staff" },
      gymId: null,
      gyms,
    };
  }

  private async loginMember(phone: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    const prisma = getPrismaClient();

    const member = await prisma.member.findFirst({
      where: { phone, deletedAt: null },
    });

    if (!member) {
      throw new UnauthorizedException("No member account found for this phone");
    }

    const accessToken = this.tokenService.issueMemberToken({
      userId: member.id,
      gymId: member.gymId,
      type: "member",
    });
    const refreshToken = await this.tokenService.issueRefreshToken(
      member.id,
      "member",
      member.gymId,
    );

    await this.writeLoginHistory(member.id, "member", member.gymId, true, ip, userAgent);
    await this.writeAuditLog(member.id, "member", member.gymId, "login");

    return {
      accessToken,
      refreshToken,
      user: { id: member.id, name: member.name, phone: member.phone, type: "member" },
      gymId: member.gymId,
    };
  }

  private async writeLoginHistory(
    userId: string,
    userType: "staff" | "member",
    gymId: string | undefined,
    success: boolean,
    ip?: string,
    userAgent?: string,
  ) {
    const prisma = getPrismaClient();
    await prisma.loginHistory.create({
      data: { userId, userType, gymId: gymId ?? null, success, ip: ip ?? null, userAgent: userAgent ?? null },
    });
  }

  private async writeAuditLog(
    actorId: string,
    actorType: "staff" | "member",
    gymId: string | undefined,
    action: "login" | "logout",
  ) {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: { actorId, actorType, gymId: gymId ?? null, action, entity: "auth" },
    });
  }
}
