import { IsEnum, IsEmail, IsString, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
  @ApiProperty({ example: "rajesh@ironforge.in" })
  @IsEmail({}, { message: "Must be a valid email address" })
  email: string;

  @ApiProperty({ example: "123456", description: "6-digit OTP sent to email" })
  @IsString()
  @Length(6, 6, { message: "OTP must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must contain only digits" })
  otp: string;

  @ApiProperty({ enum: ["staff", "member"] })
  @IsEnum(["staff", "member"])
  userType: "staff" | "member";
}
