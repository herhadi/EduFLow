import { IsDateString, IsString, MaxLength } from 'class-validator';
export class CreateOutgoingLetterDto {
  @IsString() @MaxLength(240) subject!: string;
  @IsString() @MaxLength(240) recipient!: string;
  @IsDateString() letterDate!: string;
  @IsString() @MaxLength(30000) body!: string;
}
