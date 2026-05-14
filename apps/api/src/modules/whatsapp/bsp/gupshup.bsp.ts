import { Logger } from "@nestjs/common";
import type {
  IWhatsAppBsp, BspSendResult, BspTemplateParams,
  BspSessionParams, BspWebhookPayload,
} from "./bsp.interface";

// Gupshup BSP — Marketing ~₹0.90, Utility ~₹0.15 per message
const COST_MARKETING_PAISE = 90;
const COST_UTILITY_PAISE = 15;

interface GupshupConfig {
  apiKey: string;
  appName: string;
  srcPhone: string;
}

export class GupshupBsp implements IWhatsAppBsp {
  private readonly logger = new Logger(GupshupBsp.name);
  private readonly base = "https://api.gupshup.io/sm/api/v1/msg";

  constructor(private readonly config: GupshupConfig) {}

  async sendTemplate(params: BspTemplateParams): Promise<BspSendResult> {
    const { phone, metaTemplateId, variables } = params;
    try {
      const body = new URLSearchParams({
        channel: "whatsapp",
        source: this.config.srcPhone,
        destination: phone.replace("+", ""),
        message: JSON.stringify({
          type: "template",
          template: { id: metaTemplateId, params: variables },
        }),
        "src.name": this.config.appName,
      });

      const res = await fetch(this.base, {
        method: "POST",
        headers: {
          apikey: this.config.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Gupshup ${res.status}: ${text}` };
      }

      const data = (await res.json()) as { messageId?: string; type?: string };
      return {
        success: true,
        bspMessageId: data.messageId,
        costPaise: COST_UTILITY_PAISE,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Gupshup sendTemplate failed: ${error}`);
      return { success: false, error };
    }
  }

  async sendSession(params: BspSessionParams): Promise<BspSendResult> {
    const { phone, text } = params;
    try {
      const body = new URLSearchParams({
        channel: "whatsapp",
        source: this.config.srcPhone,
        destination: phone.replace("+", ""),
        message: JSON.stringify({ type: "text", text }),
        "src.name": this.config.appName,
      });

      const res = await fetch(this.base, {
        method: "POST",
        headers: {
          apikey: this.config.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Gupshup ${res.status}: ${text}` };
      }

      const data = (await res.json()) as { messageId?: string };
      return { success: true, bspMessageId: data.messageId, costPaise: COST_MARKETING_PAISE };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    }
  }

  parseWebhook(body: unknown): BspWebhookPayload | null {
    try {
      const payload = body as Record<string, unknown>;
      const msg = payload["payload"] as Record<string, unknown> | undefined;
      if (!msg) return null;

      const gsId = String(msg["gsId"] ?? "");
      const type = String(msg["type"] ?? "");

      const statusMap: Record<string, BspWebhookPayload["status"]> = {
        delivered: "delivered",
        read: "read",
        failed: "failed",
      };

      const status = statusMap[type];
      if (!status || !gsId) return null;

      return { bspMessageId: gsId, status, rawBody: body };
    } catch {
      return null;
    }
  }
}
