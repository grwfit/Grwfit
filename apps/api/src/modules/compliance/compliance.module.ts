import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ComplianceController, MemberComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  controllers: [ComplianceController, MemberComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
