import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpService } from "./services/otp.service";
import { TokenService } from "./services/token.service";
import { WhatsAppService } from "./services/whatsapp.service";
import { SmsService } from "./services/sms.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, WhatsAppService, SmsService],
  exports: [AuthService, TokenService, WhatsAppService],
})
export class AuthModule {}
