import { IsEnum, IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RequestOtpDto {
  @ApiProperty({ example: "rajesh@ironforge.in" })
  @IsEmail({}, { message: "Must be a valid email address" })
  email: string;

  @ApiProperty({ enum: ["staff", "member"] })
  @IsEnum(["staff", "member"])
  userType: "staff" | "member";
}
