import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsDateString, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ListMembersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(() => Number)
  limit?: number = 25;

  @ApiPropertyOptional({ description: "Fuzzy search: name, phone, or member ID" })
  @IsString() @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ["active", "expired", "frozen", "trial"] })
  @IsEnum(["active", "expired", "frozen", "trial"]) @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  planId?: string;

  @ApiPropertyOptional({ example: "2024-01-01" })
  @IsDateString() @IsOptional()
  joinedFrom?: string;

  @ApiPropertyOptional({ example: "2024-12-31" })
  @IsDateString() @IsOptional()
  joinedTo?: string;

  @ApiPropertyOptional({ example: "vip" })
  @IsString() @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ enum: ["name", "joinedAt", "expiresAt", "createdAt"], default: "createdAt" })
  @IsEnum(["name", "joinedAt", "expiresAt", "createdAt"]) @IsOptional()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsEnum(["asc", "desc"]) @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
