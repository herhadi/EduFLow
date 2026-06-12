import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  schoolYearId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  grade?: string;
}
