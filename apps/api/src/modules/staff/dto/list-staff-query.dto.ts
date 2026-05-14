import { IsEnum, IsOptional, IsUUID, IsString, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ListStaffQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(() => Number)
  limit?: number = 25;

  @ApiPropertyOptional({ enum: ["owner", "manager", "trainer", "reception"] })
  @IsEnum(["owner", "manager", "trainer", "reception"])
  @IsOptional()
  role?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: "Search by name or phone" })
  @IsString() @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ["true", "false"], default: "true" })
  @IsOptional()
  isActive?: string;
}
