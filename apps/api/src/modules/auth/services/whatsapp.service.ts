import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../../config/configuration";

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async sendOtp(phone: string, otp: string): Promise<WhatsAppResult> {
    const bsp = this.configService.get("whatsapp.bsp", { infer: true });

    const result =
      bsp === "wati"
        ? await this.sendViaWati(phone, otp)
        : await this.sendViaGupshup(phone, otp);

    if (!result.success) {
      this.logger.warn(`WhatsApp OTP failed for ${phone}: ${result.error}`);
    } else {
      this.logger.log(`WhatsApp OTP sent to ${phone} via ${bsp}`);
    }
    return result;
  }

  async sendTemplate(phone: string, templateId: string, params: string[]): Promise<WhatsAppResult> {
    const bsp = this.configService.get("whatsapp.bsp", { infer: true });
    return bsp === "wati"
      ? this.sendTemplateViaWati(phone, templateId, params)
      : this.sendTemplateViaGupshup(phone, templateId, params);
  }

  private async sendViaGupshup(phone: string, otp: string): Promise<WhatsAppResult> {
    const apiKey = this.configService.get("whatsapp.gupshupApiKey", { infer: true });
    const appName = this.configService.get("whatsapp.gupshupAppName", { infer: true });

    if (!apiKey) {
      this.logger.warn("Gupshup API key not configured — skipping WhatsApp");
      return { success: false, error: "Not configured" };
    }

    try {
      const body = new URLSearchParams({
        channel: "whatsapp",
        source: appName,
        destination: phone.replace("+", ""),
        message: JSON.stringify({
          type: "text",
          text: `Your GrwFit OTP is: ${otp}\n\nValid for 5 minutes. Do not share this with anyone.`,
        }),
        "src.name": appName,
      });

      const response = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Gupshup error: ${text}` };
      }

      const data = (await response.json()) as { messageId?: string };
      return { success: true, messageId: data.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  private async sendViaWati(phone: string, otp: string): Promise<WhatsAppResult> {
    const endpoint = this.configService.get("whatsapp.watiEndpoint", { infer: true });
    const token = this.configService.get("whatsapp.watiToken", { infer: true });

    if (!endpoint || !token) {
      this.logger.warn("Wati not configured — skipping WhatsApp");
      return { success: false, error: "Not configured" };
    }

    try {
      const response = await fetch(
        `${endpoint}/api/v1/sendSessionMessage/${phone.replace("+", "")}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageText: `Your GrwFit OTP is: ${otp}\n\nValid for 5 minutes.`,
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Wati error: ${text}` };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  private async sendTemplateViaGupshup(
    phone: string,
    templateId: string,
    params: string[],
  ): Promise<WhatsAppResult> {
    const apiKey = this.configService.get("whatsapp.gupshupApiKey", { infer: true });
    const appName = this.configService.get("whatsapp.gupshupAppName", { infer: true });
    if (!apiKey) return { success: false, error: "Not configured" };

    try {
      const body = new URLSearchParams({
        channel: "whatsapp",
        source: appName,
        destination: phone.replace("+", ""),
        message: JSON.stringify({ type: "template", template: { id: templateId, params } }),
        "src.name": appName,
      });
      const response = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!response.ok) return { success: false, error: await response.text() };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  private async sendTemplateViaWati(
    phone: string,
    templateId: string,
    params: string[],
  ): Promise<WhatsAppResult> {
    const endpoint = this.configService.get("whatsapp.watiEndpoint", { infer: true });
    const token = this.configService.get("whatsapp.watiToken", { infer: true });
    if (!endpoint || !token) return { success: false, error: "Not configured" };

    try {
      const response = await fetch(`${endpoint}/api/v1/sendTemplateMessage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: phone.replace("+", ""), templateName: templateId, broadcast_name: "grwfit", parameters: params }),
      });
      if (!response.ok) return { success: false, error: await response.text() };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}
