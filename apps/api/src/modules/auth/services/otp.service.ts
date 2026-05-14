import {
  Injectable, HttpException, HttpStatus,
  UnauthorizedException, Logger,
} from "@nestjs/common";

class TooManyRequestsException extends HttpException {
  constructor(msg?: string) { super(msg ?? "Too many requests", HttpStatus.TOO_MANY_REQUESTS); }
}
import * as bcrypt from "bcrypt";
import { getPrismaClient } from "@grwfit/db";
import type { UserType } from "@grwfit/db";

const OTP_MAX_REQUESTS_PER_HOUR = 3;
const OTP_LOCKOUT_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  async requestOtp(phone: string, userType: UserType): Promise<string> {
    const prisma = getPrismaClient();

    await this.checkRateLimit(phone, userType);

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.authOtp.create({
      data: { phone, otpHash, userType, expiresAt },
    });

    this.logger.log(`OTP requested for ${phone} [${userType}]`);
    return otp;
  }

  async verifyOtp(phone: string, otp: string, userType: UserType): Promise<void> {
    const prisma = getPrismaClient();

    // Find the most recent unused, non-expired OTP for this phone
    const record = await prisma.authOtp.findFirst({
      where: {
        phone,
        userType,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check phone lockout (3 failed attempts within OTP window)
    if (!record) {
      // Check if locked out due to past attempts
      const locked = await prisma.authOtp.findFirst({
        where: {
          phone,
          userType,
          attempts: { gte: OTP_MAX_ATTEMPTS },
          createdAt: { gte: new Date(Date.now() - OTP_LOCKOUT_MINUTES * 60 * 1000) },
        },
      });
      if (locked) {
        throw new TooManyRequestsException(
          `Too many failed attempts. Try again in ${OTP_LOCKOUT_MINUTES} minutes.`,
        );
      }
      throw new UnauthorizedException("OTP expired or not found. Request a new one.");
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new TooManyRequestsException(
        `Too many failed attempts. Try again in ${OTP_LOCKOUT_MINUTES} minutes.`,
      );
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      await prisma.authOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      throw new UnauthorizedException(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : `Too many failed attempts. Try again in ${OTP_LOCKOUT_MINUTES} minutes.`,
      );
    }

    // Mark OTP as used
    await prisma.authOtp.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  private async checkRateLimit(phone: string, userType: UserType): Promise<void> {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour

    const recentCount = await prisma.authOtp.count({
      where: {
        phone,
        userType,
        createdAt: { gte: since },
      },
    });

    if (recentCount >= OTP_MAX_REQUESTS_PER_HOUR) {
      throw new TooManyRequestsException(
        "Too many OTP requests. Try again in an hour.",
      );
    }
  }

  private generateOtp(): string {
    // Cryptographically random 6-digit OTP
    const min = 100000;
    const max = 999999;
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range;

    let randomValue: number;
    do {
      const bytes = require("crypto").randomBytes(bytesNeeded) as Buffer;
      randomValue = bytes.reduce((acc: number, b: number) => acc * 256 + b, 0);
    } while (randomValue >= maxValid);

    return String(min + (randomValue % range));
  }
}
