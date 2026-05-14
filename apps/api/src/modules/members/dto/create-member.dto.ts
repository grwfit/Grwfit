import {
  IsString, IsOptional, IsEmail, IsEnum, IsUUID,
  IsDateString, IsArray, Matches, ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

class MemberAddressDto {
  @IsString() @IsOptional() street?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
}

/** Quick add — only name + phone required */
export class CreateMemberQuickDto {
  @ApiProperty({ example: "Amit Kumar" })
  @IsString()
  name: string;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: "Phone must be a valid +91 Indian number" })
  phone: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  planId?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  assignedTrainerId?: string;
}

/** Full onboarding */
export class CreateMemberFullDto extends CreateMemberQuickDto {
  @ApiPropertyOptional({ example: "amit@example.com" })
  @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "1995-03-15" })
  @IsDateString() @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ enum: ["male", "female", "other", "prefer_not_to_say"] })
  @IsEnum(["male", "female", "other", "prefer_not_to_say"]) @IsOptional()
  gender?: "male" | "female" | "other" | "prefer_not_to_say";

  @ApiPropertyOptional()
  @ValidateNested() @Type(() => MemberAddressDto) @IsOptional()
  address?: MemberAddressDto;

  @ApiPropertyOptional({ example: "Ritu Sharma" })
  @IsString() @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: "+919876543211" })
  @IsString() @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: ["weight_loss", "muscle_gain"] })
  @IsArray() @IsString({ each: true }) @IsOptional()
  goals?: string[];

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  healthNotes?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  medicalConditions?: string;

  @ApiPropertyOptional({ example: ["vip"] })
  @IsArray() @IsString({ each: true }) @IsOptional()
  tags?: string[];
}
