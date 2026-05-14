import { IsUUID, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AssignTrainerDto {
  @ApiPropertyOptional({
    description: "Trainer staff user ID. Pass null to unassign.",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsOptional()
  trainerId?: string | null;
}
