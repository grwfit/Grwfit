import {
  IsEnum,
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class UpdateStaffDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ["owner", "manager", "trainer", "reception"] })
  @IsEnum(["owner", "manager", "trainer", "reception"])
  @IsOptional()
  role?: "owner" | "manager" | "trainer" | "reception";

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  commissionPct?: number;
}
