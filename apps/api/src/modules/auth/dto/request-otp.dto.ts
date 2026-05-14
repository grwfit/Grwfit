import { IsEnum, IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RequestOtpDto {
  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: "Phone must be a valid +91 Indian number" })
  phone: string;

  @ApiProperty({ enum: ["staff", "member"] })
  @IsEnum(["staff", "member"])
  userType: "staff" | "member";
}
