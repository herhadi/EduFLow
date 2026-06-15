import { TeachingPlanType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class CreateTeachingPlanDto {
  @IsUUID()
  subjectId!: string;

  @IsUUID()
  schoolYearId!: string;

  @IsOptional()
  @IsUUID()
  semesterId?: string;

  @IsEnum(TeachingPlanType)
  type!: TeachingPlanType;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  attachmentUrl?: string;
}
