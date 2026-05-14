import { Logger } from "@nestjs/common";
import type {
  IWhatsAppBsp, BspSendResult, BspTemplateParams,
  BspSessionParams, BspWebhookPayload,
} from "./bsp.interface";

const COST_PAISE = 15;

interface WatiConfig {
  endpoint: string;
  token: string;
}

export class WatiBsp implements IWhatsAppBsp {
  private readonly logger = new Logger(WatiBsp.name);

  constructor(private readonly config: WatiConfig) {}

  async sendTemplate(params: BspTemplateParams): Promise<BspSendResult> {
    const { phone, metaTemplateId, variables } = params;
    const cleanPhone = phone.replace("+", "");
    try {
      const res = await fetch(`${this.config.endpoint}/api/v1/sendTemplateMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsappNumber: cleanPhone,
          templateName: metaTemplateId,
          broadcast_name: "grwfit",
          parameters: variables.map((v) => ({ name: "param", value: v })),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Wati ${res.status}: ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, bspMessageId: data.id, costPaise: COST_PAISE };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Wati sendTemplate failed: ${error}`);
      return { success: false, error };
    }
  }

  async sendSession(params: BspSessionParams): Promise<BspSendResult> {
    const cleanPhone = params.phone.replace("+", "");
    try {
      const res = await fetch(
        `${this.config.endpoint}/api/v1/sendSessionMessage/${cleanPhone}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageText: params.text }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Wati ${res.status}: ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, bspMessageId: data.id, costPaise: COST_PAISE };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    }
  }

  parseWebhook(body: unknown): BspWebhookPayload | null {
    try {
      const payload = body as Record<string, unknown>;
      const msgId = String(payload["whatsappMessageId"] ?? "");
      const type = String(payload["eventType"] ?? "");

      const statusMap: Record<string, BspWebhookPayload["status"]> = {
        DELIVERED: "delivered",
        READ: "read",
        FAILED: "failed",
      };

      const status = statusMap[type];
      if (!status || !msgId) return null;

      return {
        bspMessageId: msgId,
        status,
        phone: String(payload["waId"] ?? ""),
        rawBody: body,
      };
    } catch {
      return null;
    }
  }
}
