import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppModuleService, BROADCAST_QUEUE, TRIGGER_QUEUE } from "./whatsapp.service";
import { BroadcastService } from "./services/broadcast.service";
import { BroadcastProcessor } from "./processors/broadcast.processor";
import { TriggerProcessor } from "./processors/trigger.processor";
import { BspFactory } from "./bsp/bsp.factory";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: BROADCAST_QUEUE }),
    BullModule.registerQueue({ name: TRIGGER_QUEUE }),
  ],
  controllers: [WhatsAppController],
  providers: [
    BspFactory,
    WhatsAppModuleService,
    BroadcastService,
    BroadcastProcessor,
    TriggerProcessor,
  ],
  exports: [WhatsAppModuleService],
})
export class WhatsAppModule {}
