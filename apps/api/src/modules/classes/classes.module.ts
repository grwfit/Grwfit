import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { ClassesController } from "./classes.controller";
import { ClassesService, WAITLIST_QUEUE } from "./classes.service";
import { WaitlistProcessor } from "./processors/waitlist.processor";
import { AuthModule } from "../auth/auth.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    AuthModule,
    WhatsAppModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: WAITLIST_QUEUE }),
  ],
  controllers: [ClassesController],
  providers: [ClassesService, WaitlistProcessor],
  exports: [ClassesService],
})
export class ClassesModule {}
