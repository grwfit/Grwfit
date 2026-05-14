import {
  IsEnum,
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsNumber,
  Min,
  Max,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateStaffDto {
  @ApiProperty({ example: "Arjun Singh" })
  @IsString()
  name: string;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: "Phone must be a valid +91 Indian number" })
  phone: string;

  @ApiProperty({ enum: ["owner", "manager", "trainer", "reception"] })
  @IsEnum(["owner", "manager", "trainer", "reception"])
  role: "owner" | "manager" | "trainer" | "reception";

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: "arjun@iron-forge.in" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 10,
    description: "Commission percentage for trainers (0-100)",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  commissionPct?: number;
}
