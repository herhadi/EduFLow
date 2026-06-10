import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class ConfigureTeacherAccountDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}
