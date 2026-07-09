import { AssessmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  schoolYearId!: string;

  @IsUUID()
  semesterId!: string;

  @IsUUID()
  classId!: string;

  @IsUUID()
  subjectId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @IsDateString()
  assessmentDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
