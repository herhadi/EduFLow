import { AcademicTimeSlotType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateAcademicTimeSlotDto {
  @IsUUID()
  schoolYearId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodNumber?: number;

  @IsString()
  name!: string;

  @IsEnum(AcademicTimeSlotType)
  type!: AcademicTimeSlotType;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startsAt!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  isAssignable?: boolean;
}
