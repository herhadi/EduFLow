import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdateOutgoingLetterDto {
  @IsOptional() @IsString() @MaxLength(240) subject?: string;
  @IsOptional() @IsString() @MaxLength(240) recipient?: string;
  @IsOptional() @IsDateString() letterDate?: string;
  @IsOptional() @IsString() @MaxLength(30000) body?: string;
}
