import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsDateString, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(() => Number)
  limit?: number = 25;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ enum: ["upi", "cash", "card", "bank_transfer", "razorpay"] })
  @IsEnum(["upi", "cash", "card", "bank_transfer", "razorpay"]) @IsOptional()
  mode?: string;

  @ApiPropertyOptional({ enum: ["pending", "captured", "failed", "refunded", "partially_refunded"] })
  @IsEnum(["pending", "captured", "failed", "refunded", "partially_refunded"]) @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  to?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  search?: string;
}

export class CreateCashReconciliationDto {
  @ApiPropertyOptional({ description: "Date for reconciliation (ISO date, defaults to today)" })
  @IsDateString() @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: "Actual cash in drawer, paise" })
  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  actualPaise?: number;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;
}

export class CreatePlanDto {
  @ApiPropertyOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsInt() @Min(1) @Type(() => Number)
  pricePaise: number;

  @ApiPropertyOptional()
  @IsInt() @Min(1) @Type(() => Number)
  durationDays: number;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  description?: string;
}
