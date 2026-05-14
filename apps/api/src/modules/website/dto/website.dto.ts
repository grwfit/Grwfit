import {
  IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsEmail,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateWebsiteContentDto {
  @ApiPropertyOptional({ enum: ["modern", "bold", "classic"] })
  @IsOptional() @IsEnum(["modern", "bold", "classic"]) templateId?: string;

  @ApiPropertyOptional({ description: "Section content: { hero, about, plans, trainers, gallery, contact }" })
  @IsOptional() @IsObject() content?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "SEO: { title, description, ogImage }" })
  @IsOptional() @IsObject() seoMeta?: Record<string, unknown>;
}

export class ConnectDomainDto {
  @ApiProperty({ example: "www.ironforge.in" })
  @IsString() domain!: string;
}

export class TrialBookingDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gymSlug?: string;
}
