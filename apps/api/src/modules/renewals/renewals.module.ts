import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { RenewalsController } from "./renewals.controller";
import { RenewalsService, REMINDER_QUEUE } from "./renewals.service";
import { ReminderProcessor } from "./processors/reminder.processor";
import { RenewalsCron } from "./renewals.cron";
import { AuthModule } from "../auth/auth.module";
import { CheckinsModule } from "../checkins/checkins.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    AuthModule,
    CheckinsModule, // for RedisService
    WhatsAppModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: REMINDER_QUEUE }),
  ],
  controllers: [RenewalsController],
  providers: [RenewalsService, ReminderProcessor, RenewalsCron],
  exports: [RenewalsService],
})
export class RenewalsModule {}
