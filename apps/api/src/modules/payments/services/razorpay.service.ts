import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import type { AppConfig } from "../../../config/configuration";

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface RazorpayRefundResult {
  id: string;
  entity: string;
  amount: number;
  status: string;
}

interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id: string;
  short_url: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = "https://api.razorpay.com/v1";

  constructor(config: ConfigService<AppConfig, true>) {
    this.keyId     = config.get("razorpay.keyId",       { infer: true });
    this.keySecret = config.get("razorpay.keySecret",   { infer: true });
    this.webhookSecret = config.get("razorpay.webhookSecret", { infer: true });
  }

  get isConfigured(): boolean {
    return !!(this.keyId && this.keySecret && !this.keyId.includes("placeholder"));
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException("Payment gateway (Razorpay) is not configured yet. Please contact support.");
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
    this.assertConfigured();
    return this.request<RazorpayOrder>("POST", "/orders", {
      amount: amountPaise,
      currency: "INR",
      receipt,
    });
  }

  async createSubscription(planId: string, memberId: string, totalCount = 12): Promise<RazorpaySubscription> {
    this.assertConfigured();
    return this.request<RazorpaySubscription>("POST", "/subscriptions", {
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      notes: { member_id: memberId },
    });
  }

  async refund(paymentId: string, amountPaise: number): Promise<RazorpayRefundResult> {
    this.assertConfigured();
    return this.request<RazorpayRefundResult>(
      "POST",
      `/payments/${paymentId}/refund`,
      { amount: amountPaise },
    );
  }

  async fetchPayment(paymentId: string): Promise<{ id: string; status: string; amount: number }> {
    return this.request("GET", `/payments/${paymentId}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.keyId || this.keyId.startsWith("rzp_test_...")) {
      throw new BadRequestException("Razorpay not configured");
    }

    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const err = (await response.json()) as { error: { description: string } };
      throw new BadRequestException(err.error?.description ?? "Razorpay error");
    }

    return response.json() as Promise<T>;
  }
}
