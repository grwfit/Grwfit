import {
  IsString, IsOptional, IsBoolean, IsArray, IsInt,
  IsObject, IsUUID, Min, Max, IsNumber,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ── Exercise & Day shapes (used in jsonb) ────────────────────────────────────
// These are validated loosely — full validation happens in the service layer.

export class CreateWorkoutTemplateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiProperty() @IsArray() exercises!: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class CreateWorkoutPlanDto {
  @ApiProperty() @IsUUID() memberId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ description: "Keyed by day: { day1: [...exercises], day2: [...] }" })
  @IsObject() week!: Record<string, unknown[]>;
}

export class UpdateWorkoutPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() week?: Record<string, unknown[]>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateDietPlanDto {
  @ApiProperty() @IsUUID() memberId!: string;
  @ApiProperty({ description: "{ breakfast: [...], lunch: [...], dinner: [...], snacks: [...] }" })
  @IsObject() meals!: Record<string, unknown[]>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) calories?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() macros?: { protein: number; carbs: number; fat: number };
}

export class UpdateDietPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() meals?: Record<string, unknown[]>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) calories?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() macros?: { protein: number; carbs: number; fat: number };
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class LogProgressDto {
  @ApiProperty() @IsUUID() memberId!: string;
  @ApiPropertyOptional({ description: "Weight in grams (e.g. 72500 = 72.5kg)" })
  @IsOptional() @IsInt() @Min(0) weightGrams?: number;
  @ApiPropertyOptional({ description: "{ chest, waist, arm, thigh } in mm" })
  @IsOptional() @IsObject() measurements?: Record<string, number>;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
