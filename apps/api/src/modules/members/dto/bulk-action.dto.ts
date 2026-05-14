import { IsArray, IsEnum, IsString, IsUUID, IsOptional, ArrayMinSize, ArrayMaxSize } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BulkActionDto {
  @ApiProperty({ example: ["id1", "id2"] })
  @IsArray()
  @IsUUID("all", { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  memberIds: string[];

  @ApiProperty({ enum: ["tag", "assign_trainer", "send_whatsapp", "export_csv"] })
  @IsEnum(["tag", "assign_trainer", "send_whatsapp", "export_csv"])
  action: "tag" | "assign_trainer" | "send_whatsapp" | "export_csv";

  @ApiPropertyOptional({ example: "vip", description: "Required for tag action" })
  @IsString() @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: "Required for assign_trainer action" })
  @IsUUID() @IsOptional()
  trainerId?: string;

  @ApiPropertyOptional({ description: "Required for send_whatsapp action" })
  @IsString() @IsOptional()
  message?: string;
}
