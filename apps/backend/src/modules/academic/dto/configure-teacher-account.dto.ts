import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfigureTeacherAccountDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  password?: string;

  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}
