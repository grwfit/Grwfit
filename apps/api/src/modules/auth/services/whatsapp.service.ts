import { Injectable } from "@nestjs/common";

// WhatsApp OTP delivery is disabled — using Supabase email OTP instead.
// This stub keeps the module wiring intact for when WhatsApp is re-enabled later.
@Injectable()
export class WhatsAppService {
  async sendOtp(_phone: string, _otp: string): Promise<{ success: boolean }> {
    return { success: false };
  }

  async sendTemplate(_phone: string, _templateId: string, _params: string[]): Promise<{ success: boolean }> {
    return { success: false };
  }
}
