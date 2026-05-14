import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CheckinsController } from "./checkins.controller";
import { CheckinsService, CHECKIN_WRITE_QUEUE } from "./checkins.service";
import { MemberCacheService } from "./services/member-cache.service";
import { CheckinWriteProcessor } from "./processors/checkin-write.processor";
import { RedisService } from "../../common/services/redis.service";
import { AuthModule } from "../auth/auth.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    AuthModule,
    WhatsAppModule,
    BullModule.registerQueue({ name: CHECKIN_WRITE_QUEUE }),
  ],
  controllers: [CheckinsController],
  providers: [CheckinsService, MemberCacheService, CheckinWriteProcessor, RedisService],
  exports: [CheckinsService, MemberCacheService, RedisService],
})
export class CheckinsModule {}
