import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { MulterModule } from "@nestjs/platform-express";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { MembersImportService, MEMBER_IMPORT_QUEUE } from "./members-import.service";
import { MemberImportProcessor } from "./processors/member-import.processor";
import { MembersCron } from "./members.cron";
import { AuthModule } from "../auth/auth.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    AuthModule,
    WhatsAppModule,
    ScheduleModule.forRoot(),
    MulterModule.register({ dest: "/tmp" }),
    BullModule.registerQueue({ name: MEMBER_IMPORT_QUEUE }),
  ],
  controllers: [MembersController],
  providers: [MembersService, MembersImportService, MemberImportProcessor, MembersCron],
  exports: [MembersService],
})
export class MembersModule {}
