import { TeachingPlanRevisionPriority, TeachingPlanStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTeachingPlanDto {
  @IsEnum(TeachingPlanStatus)
  status!: 'APPROVED' | 'REVISION_REQUESTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reviewSection?: string;

  @IsOptional()
  @IsEnum(TeachingPlanRevisionPriority)
  reviewPriority?: TeachingPlanRevisionPriority;
}
