import { IsEmail, IsString, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PlatformLoginDto {
  @ApiProperty({ example: "admin@grwfit.com" })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(8, 100)
  password: string;

  @ApiProperty({ example: "123456", description: "6-digit TOTP from Google Authenticator" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: "TOTP code must be 6 digits" })
  totpCode: string;
}
