import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddNoteDto {
  @ApiProperty({ example: "Member requested diet plan update. Follow up next week." })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note: string;
}
