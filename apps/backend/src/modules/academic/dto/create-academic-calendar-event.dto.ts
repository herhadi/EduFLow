import { AcademicCalendarEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAcademicCalendarEventDto {
  @IsUUID()
  schoolYearId!: string;

  @IsOptional()
  @IsUUID()
  semesterId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AcademicCalendarEventType)
  type!: AcademicCalendarEventType;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  blocksAgenda?: boolean;
}
