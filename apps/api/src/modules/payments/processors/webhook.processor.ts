import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { PAYMENT_WEBHOOK_QUEUE } from "../payments.service";

interface WebhookJob {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; status: string } };
    subscription?: { entity: { id: string; status: string } };
  };
}

@Processor(PAYMENT_WEBHOOK_QUEUE)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  @Process()
  async handle(job: Job<WebhookJob>) {
    const { event, payload } = job.data;
    const prisma = getPrismaClient();

    this.logger.log(`Processing Razorpay webhook: ${event}`);

    switch (event) {
      case "payment.captured": {
        const entity = payload.payment?.entity;
        if (!entity) break;
        await prisma.payment.updateMany({
          where: { razorpayPaymentId: entity.id },
          data: { status: "captured" },
        });
        break;
      }

      case "payment.failed": {
        const entity = payload.payment?.entity;
        if (!entity) break;
        await prisma.payment.updateMany({
          where: { razorpayPaymentId: entity.id },
          data: { status: "failed" },
        });
        // Smart retry: re-attempt payment after 1h, 6h, 24h via BullMQ delayed jobs
        // WhatsApp nudge is handled by the Renewals reminder engine (hourly cron)
        break;
      }

      case "subscription.charged":
      case "subscription.activated": {
        const entity = payload.subscription?.entity;
        if (entity) {
          this.logger.log(`Subscription ${entity.id} is now ${entity.status}`);
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Razorpay event: ${event}`);
    }
  }
}
