import { IsString, IsOptional, IsBoolean, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

class BranchAddressDto {
  @IsString() @IsOptional() street?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
}

export class CreateBranchDto {
  @ApiProperty({ example: "South Branch" })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => BranchAddressDto)
  @IsOptional()
  address?: BranchAddressDto;

  @ApiPropertyOptional({ example: "+919876543210" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateBranchDto extends CreateBranchDto {}
