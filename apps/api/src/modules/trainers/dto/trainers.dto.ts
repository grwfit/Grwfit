import {
  IsString, IsOptional, IsArray, IsInt, IsUUID,
  IsEnum, IsDateString, Min, Max, IsNumber,
} from "class-validator";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";

export class UpdateTrainerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) specializations?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) certifications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
}

export class AssignTrainerDto {
  @ApiProperty() @IsUUID() trainerId!: string;
}

export class ListCommissionsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(["pending","approved","paid","cancelled"]) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() month?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}

export class ApproveCommissionsDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID("all", { each: true }) commissionIds!: string[];
}

export class MarkPaidDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID("all", { each: true }) commissionIds!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
