import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PaymentsController } from "./payments.controller";
import { PaymentsService, PAYMENT_WEBHOOK_QUEUE } from "./payments.service";
import { InvoiceService } from "./services/invoice.service";
import { PdfService } from "./services/pdf.service";
import { StorageService } from "./services/storage.service";
import { RazorpayService } from "./services/razorpay.service";
import { WebhookProcessor } from "./processors/webhook.processor";
import { AuthModule } from "../auth/auth.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { TrainersModule } from "../trainers/trainers.module";

@Module({
  imports: [
    AuthModule,
    WhatsAppModule,
    TrainersModule,
    BullModule.registerQueue({ name: PAYMENT_WEBHOOK_QUEUE }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService, InvoiceService, PdfService,
    StorageService, RazorpayService, WebhookProcessor,
  ],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
