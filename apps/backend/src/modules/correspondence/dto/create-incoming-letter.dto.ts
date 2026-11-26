import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateIncomingLetterDto {
  @IsOptional() @IsString() @MaxLength(120) referenceNumber?: string;
  @IsString() @MaxLength(240) sender!: string;
  @IsString() @MaxLength(240) subject!: string;
  @IsOptional() @IsDateString() letterDate?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
