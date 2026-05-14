import {
  IsString, IsOptional, IsEmail, IsObject, IsInt, Min, Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GymSignupDto {
  @ApiProperty() @IsString() gymName!: string;
  @ApiProperty() @IsString() ownerName!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
}

export class Step1GymProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() address?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsString() gstNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() operatingHours?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

export class Step2PlansDto {
  @ApiProperty({ type: [Object] })
  plans!: Array<{ name: string; pricePaise: number; durationDays: number }>;
}

export class Step3StaffDto {
  @ApiProperty({ type: [Object] })
  trainers!: Array<{ name: string; phone: string; commissionPct?: number }>;
}

export class Step5FirstCheckinDto {
  @ApiProperty() @IsString() memberId!: string;
}

export class ConvertTrialDto {
  @ApiProperty({ enum: ["basic","standard","pro"] }) @IsString() planTier!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() razorpayPaymentId?: string;
}
