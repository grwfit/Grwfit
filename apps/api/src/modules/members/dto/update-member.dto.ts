import {
  IsString, IsOptional, IsEmail, IsEnum, IsUUID,
  IsDateString, IsArray, Matches, ValidateNested,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

class MemberAddressDto {
  @IsString() @IsOptional() street?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dob?: string;
  @ApiPropertyOptional({ enum: ["male", "female", "other", "prefer_not_to_say"] })
  @IsEnum(["male", "female", "other", "prefer_not_to_say"]) @IsOptional()
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  @ApiPropertyOptional() @ValidateNested() @Type(() => MemberAddressDto) @IsOptional() address?: MemberAddressDto;
  @ApiPropertyOptional() @IsString() @IsOptional() emergencyContactName?: string;
  @ApiPropertyOptional()
  @IsString() @Matches(/^\+91[6-9]\d{9}$/, { message: "Emergency phone must be +91 format" })
  @IsOptional() emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() goals?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() healthNotes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() medicalConditions?: string;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @ApiPropertyOptional() @IsUUID() @IsOptional() assignedTrainerId?: string | null;
  @ApiPropertyOptional() @IsUUID() @IsOptional() branchId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() planId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() photoUrl?: string;
}
