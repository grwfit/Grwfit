import {
  IsEnum, IsString, IsOptional, IsUUID, IsBoolean,
  IsInt, Min, Max, IsDateString, IsArray, ArrayMinSize, ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class RenewalsDashboardQueryDto {
  @ApiPropertyOptional({ description: "Filter by branch ID" })
  @IsUUID() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: "Filter by trainer ID" })
  @IsUUID() @IsOptional()
  trainerId?: string;

  @ApiPropertyOptional({ description: "Filter by plan ID" })
  @IsUUID() @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    enum: ["today", "week", "month", "expired_7", "expired_30", "expired_90", "expired_old"],
    description: "Which expiry bucket to view",
  })
  @IsEnum(["today", "week", "month", "expired_7", "expired_30", "expired_90", "expired_old"])
  @IsOptional()
  bucket?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsInt() @Min(1) @Max(200) @IsOptional() @Type(() => Number)
  limit?: number = 50;
}

export class SendReminderDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  memberId: string;

  @ApiPropertyOptional({ description: "Override trigger type; defaults to appropriate type for expiry window" })
  @IsString() @IsOptional()
  triggerType?: string;
}

export class BulkReminderDto {
  @ApiPropertyOptional({ description: "Which bucket to target; defaults to 'week'" })
  @IsEnum(["today", "week", "month", "expired_7", "expired_30"]) @IsOptional()
  bucket?: string;

  @ApiPropertyOptional({ description: "Specific member IDs; overrides bucket" })
  @IsArray() @IsUUID("all", { each: true }) @ArrayMinSize(1) @ArrayMaxSize(500) @IsOptional()
  memberIds?: string[];
}

export class MarkContactedDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  memberId: string;

  @ApiProperty({ enum: ["contacted", "interested", "not_interested", "converted", "no_answer"] })
  @IsEnum(["contacted", "interested", "not_interested", "converted", "no_answer"])
  outcome: "contacted" | "interested" | "not_interested" | "converted" | "no_answer";

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Schedule a follow-up date" })
  @IsDateString() @IsOptional()
  followUpAt?: string;
}

export class UpdateRenewalConfigDto {
  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  templateId?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  includeOffer?: boolean;

  @ApiPropertyOptional()
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(() => Number)
  offerPct?: number;
}

export class UpsertTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  metaTemplateId?: string;

  @ApiPropertyOptional()
  @IsArray() @IsString({ each: true }) @IsOptional()
  variables?: string[];

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  category?: string;
}
