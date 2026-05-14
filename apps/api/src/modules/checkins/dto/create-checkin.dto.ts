import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCheckinDto {
  @ApiProperty({
    description: "Member UUID or QR code string (GRW-UUID). Exactly one of memberId or qrCode must be supplied.",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ example: "GRW-550E8400..." })
  @IsString()
  @IsOptional()
  qrCode?: string;

  @ApiProperty({ enum: ["qr", "manual", "biometric"], default: "qr" })
  @IsEnum(["qr", "manual", "biometric"])
  method: "qr" | "manual" | "biometric";

  @ApiPropertyOptional({ example: "kiosk-01" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class UpdateCheckinSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  allowExpired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  notifyWhatsApp?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notifyMessage?: string;
}
