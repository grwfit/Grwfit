import { Injectable, Logger, UnauthorizedException, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../../config/configuration";

class TooManyRequestsException extends HttpException {
  constructor(msg?: string) { super(msg ?? "Too many requests", HttpStatus.TOO_MANY_REQUESTS); }
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.supabaseUrl = config.get("supabase.url", { infer: true });
    this.supabaseAnonKey = config.get("supabase.anonKey", { infer: true });
  }

  // Send OTP email via Supabase built-in email OTP
  async requestOtp(email: string): Promise<void> {
    const res = await fetch(`${this.supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.supabaseAnonKey,
      },
      body: JSON.stringify({ email, create_user: false }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      // 422 = email not found in Supabase Auth — treat as success (don't reveal user existence)
      if (res.status === 422) {
        this.logger.warn(`Supabase OTP: email not registered — ${email}`);
        return;
      }
      if (res.status === 429) throw new TooManyRequestsException("Too many OTP requests. Try again later.");
      this.logger.error(`Supabase OTP request failed: ${JSON.stringify(body)}`);
      throw new HttpException("Failed to send OTP. Please try again.", HttpStatus.BAD_GATEWAY);
    }

    this.logger.log(`Email OTP sent to ${email}`);
  }

  // Verify OTP token via Supabase
  async verifyOtp(email: string, token: string): Promise<void> {
    const res = await fetch(`${this.supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.supabaseAnonKey,
      },
      body: JSON.stringify({ email, token, type: "email" }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, string>;
      if (res.status === 401 || res.status === 422) {
        throw new UnauthorizedException(body["error_description"] ?? "Invalid or expired OTP.");
      }
      if (res.status === 429) throw new TooManyRequestsException("Too many attempts. Try again later.");
      this.logger.error(`Supabase OTP verify failed: ${JSON.stringify(body)}`);
      throw new UnauthorizedException("OTP verification failed. Please try again.");
    }
  }
}
