import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateMyTeacherProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  @Matches(/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  telegramId?: string;
}
