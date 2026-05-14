import { IsString, IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FreezeMemberDto {
  @ApiPropertyOptional({ example: "Travelling abroad for 3 weeks" })
  @IsString() @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: "2024-12-31", description: "Auto-unfreezes on this date" })
  @IsDateString() @IsOptional()
  untilDate?: string;
}
