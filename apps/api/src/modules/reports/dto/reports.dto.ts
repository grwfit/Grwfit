import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export type DatePreset = "today" | "7d" | "30d" | "mtd" | "qtd" | "ytd" | "custom";

export class ReportsFilterDto {
  @ApiPropertyOptional({ enum: ["today","7d","30d","mtd","qtd","ytd","custom"] })
  @IsOptional() @IsEnum(["today","7d","30d","mtd","qtd","ytd","custom"]) preset?: DatePreset;

  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() compareTo?: string; // prev_period | prev_year
}

export class AttendanceReportDto extends ReportsFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
}
