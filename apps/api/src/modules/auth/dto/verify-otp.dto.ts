import { IsEnum, IsString, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: "Phone must be a valid +91 Indian number" })
  phone: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(6, 6, { message: "OTP must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must contain only digits" })
  otp: string;

  @ApiProperty({ enum: ["staff", "member"] })
  @IsEnum(["staff", "member"])
  userType: "staff" | "member";
}
