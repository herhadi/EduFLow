import { IsOptional, IsUrl } from 'class-validator';

export class UpdateMyTeacherProfileDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  photoUrl?: string;
}
