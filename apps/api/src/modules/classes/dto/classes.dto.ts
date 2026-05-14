import {
  IsString, IsOptional, IsBoolean, IsInt, IsUUID,
  IsDateString, Min, Max, IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClassTemplateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(1) capacity!: number;
  @ApiProperty() @IsInt() @Min(15) durationMin!: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional({ description: "iCal RRULE, e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR" })
  @IsOptional() @IsString() recurrenceRule?: string;
}

export class UpdateClassTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recurrenceRule?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateClassInstanceDto {
  @ApiProperty() @IsUUID() templateId!: string;
  @ApiProperty() @IsDateString() startsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
}

export class UpdateClassInstanceDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(["scheduled","cancelled"]) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BookClassDto {
  @ApiProperty() @IsUUID() instanceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() memberId?: string;
}

export class ListInstancesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() trainerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() templateId?: string;
}

export class UpdateClassSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(48) cancellationHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lateCancelForfeits?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoWaitlistPromote?: boolean;
}
