import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
