import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: "Refresh token (optional — reads from cookie if omitted)" })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
