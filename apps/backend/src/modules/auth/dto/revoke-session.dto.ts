import { IsOptional, IsString, MinLength } from 'class-validator';

export class RevokeSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken?: string;
}
