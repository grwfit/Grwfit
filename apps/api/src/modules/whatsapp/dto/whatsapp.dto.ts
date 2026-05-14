import {
  IsString, IsOptional, IsBoolean, IsEnum, IsArray,
  IsDateString, IsInt, IsUUID, IsObject, Min, Max,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTemplateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTemplateId?: string;
  @ApiProperty() @IsString() body!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) variables!: string[];
  @ApiPropertyOptional() @IsOptional() @IsIn(["UTILITY", "MARKETING", "AUTHENTICATION"]) category?: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTemplateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @ApiPropertyOptional() @IsOptional() @IsIn(["UTILITY", "MARKETING", "AUTHENTICATION"]) category?: string;
}

export class TestTemplateSendDto {
  @ApiProperty({ example: "+919999999999" }) @IsString() phone!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) variables!: string[];
}

export class CreateBroadcastDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsUUID() templateId!: string;
  @ApiPropertyOptional({ description: "Audience filter object" })
  @IsOptional() @IsObject() audienceFilter?: Record<string, unknown>;
  @ApiPropertyOptional({ description: "ISO datetime for scheduled send" })
  @IsOptional() @IsDateString() scheduledFor?: string;
}

export class BroadcastAudienceQueryDto {
  @ApiPropertyOptional({ enum: ["active", "expired", "frozen", "trial"] })
  @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() planId?: string;
}

export class UpsertTriggerRuleDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() templateId?: string;
  @ApiPropertyOptional({ description: "Extra config e.g. { delayMinutes: 30 }" })
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class SendTriggerDto {
  @ApiProperty({ enum: [
    "member_created", "payment_success", "checkin", "renewal_7d",
    "renewal_3d", "renewal_1d", "renewal_expired", "renewal_7d_after",
    "renewal_30d_after", "birthday", "no_checkin_14d",
  ]})
  @IsString() event!: string;
  @ApiProperty() @IsUUID() memberId!: string;
  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject() context?: Record<string, string>;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() memberId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
