import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as speakeasy from "speakeasy";
import { getPrismaClient } from "@grwfit/db";
import { TokenService } from "../auth/services/token.service";
import type { PlatformLoginDto } from "./dto/platform-login.dto";

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(private readonly tokenService: TokenService) {}

  async login(
    dto: PlatformLoginDto,
    ip: string,
  ): Promise<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }> {
    const prisma = getPrismaClient();

    const user = await prisma.platformUser.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // IP allowlist check
    const allowlist = user.ipAllowlist as string[];
    if (allowlist.length > 0 && !allowlist.includes(ip)) {
      this.logger.warn(`Platform login blocked from IP ${ip} for ${dto.email}`);
      throw new ForbiddenException("Access denied from this IP address");
    }

    // Password check
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.writeAuditLog(user.id, "login_failed", ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    // TOTP — required always (no bypass)
    if (!user.totpSecret) {
      throw new ForbiddenException(
        "2FA not configured. Contact the platform team to set up your authenticator.",
      );
    }

    const totpValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: dto.totpCode,
      window: 1, // allow 30s clock skew
    });

    if (!totpValid) {
      await this.writeAuditLog(user.id, "totp_failed", ip);
      throw new UnauthorizedException("Invalid 2FA code");
    }

    // Update last login
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.tokenService.issuePlatformToken({
      userId: user.id,
      platformRole: user.role,
      type: "platform",
    });

    await this.writeAuditLog(user.id, "login", ip);
    this.logger.log(`Platform login: ${dto.email} from ${ip}`);

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async setupTotp(userId: string): Promise<{ secret: string; qrUrl: string }> {
    const prisma = getPrismaClient();
    const user = await prisma.platformUser.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const secret = speakeasy.generateSecret({ name: `GrwFit Platform (${user.email})` });

    await prisma.platformUser.update({
      where: { id: userId },
      data: { totpSecret: secret.base32, totpEnabled: false },
    });

    return { secret: secret.base32, qrUrl: secret.otpauth_url ?? "" };
  }

  async confirmTotp(userId: string, token: string): Promise<void> {
    const prisma = getPrismaClient();
    const user = await prisma.platformUser.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new UnauthorizedException("TOTP not initialized");

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException("Invalid TOTP code");

    await prisma.platformUser.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });
  }

  private async writeAuditLog(actorId: string, action: string, ip: string) {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        actorId,
        actorType: "platform",
        action: "login",
        entity: "platform_auth",
        ip,
      },
    });
  }
}
