import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../../config/configuration";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    // MSG91 SMS fallback
    const authKey = process.env["MSG91_AUTH_KEY"];
    const templateId = process.env["MSG91_TEMPLATE_ID"];
    const senderId = process.env["MSG91_SENDER_ID"] ?? "GRWFIT";

    if (!authKey || !templateId) {
      this.logger.warn("MSG91 not configured — SMS fallback skipped");
      return false;
    }

    const mobileNumber = phone.replace("+", "");

    try {
      const response = await fetch("https://api.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: mobileNumber,
          authkey: authKey,
          realTimeResponse: "1",
          otp,
          sender: senderId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`MSG91 SMS failed for ${phone}: ${text}`);
        return false;
      }

      this.logger.log(`SMS OTP sent to ${phone} via MSG91`);
      return true;
    } catch (err) {
      this.logger.error(`MSG91 SMS error: ${err instanceof Error ? err.message : "Unknown"}`);
      return false;
    }
  }
}
