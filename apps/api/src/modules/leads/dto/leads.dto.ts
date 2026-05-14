import {
  IsString, IsOptional, IsEmail, IsEnum, IsUUID,
  IsArray, IsDateString, IsInt, Min, Max, IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLeadStageDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsInt() @Min(0) position!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() isDefault?: boolean;
}

export class UpdateLeadStageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID("all", { each: true }) stageIds!: string[];
}

export class CreateLeadDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(["walk_in","website","whatsapp","phone_call","instagram","referral","other"]) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() sourceDetails?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() followUpAt?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() followUpAt?: string;
}

export class MoveLeadDto {
  @ApiProperty() @IsUUID() stageId!: string;
}

export class LostLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ConvertLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() planId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTrainerId?: string;
}

export class AddLeadActivityDto {
  @ApiProperty({ enum: ["note","call","whatsapp","email","visit"] })
  @IsEnum(["note","call","whatsapp","email","visit"]) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() stageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
