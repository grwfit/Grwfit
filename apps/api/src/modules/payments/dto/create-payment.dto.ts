import {
  IsEnum, IsInt, IsOptional, IsString, IsUUID, Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreatePaymentDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  memberId: string;

  @ApiPropertyOptional({ description: "Membership plan ID" })
  @IsUUID() @IsOptional()
  planId?: string;

  @ApiProperty({ description: "Total amount in PAISE (inclusive of GST)", example: 150000 })
  @IsInt() @Min(1) @Type(() => Number)
  totalPaise: number;

  @ApiProperty({ enum: ["upi", "cash", "card", "bank_transfer", "razorpay"] })
  @IsEnum(["upi", "cash", "card", "bank_transfer", "razorpay"])
  mode: "upi" | "cash" | "card" | "bank_transfer" | "razorpay";

  @ApiPropertyOptional({ example: "UPI ref / cheque no / last 4 digits" })
  @IsString() @IsOptional()
  txnRef?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;
}
