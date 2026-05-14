import { IsInt, IsString, Min, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class RefundDto {
  @ApiProperty({ description: "Refund amount in paise", example: 75000 })
  @IsInt() @Min(1) @Type(() => Number)
  amountPaise: number;

  @ApiProperty({ example: "Member requested cancellation" })
  @IsString() @MinLength(3)
  reason: string;
}
