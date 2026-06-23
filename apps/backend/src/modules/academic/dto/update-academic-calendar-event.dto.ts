import { AcademicCalendarEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAcademicCalendarEventDto {
  @IsOptional()
  @IsUUID()
  semesterId?: string | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(AcademicCalendarEventType)
  type?: AcademicCalendarEventType;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  blocksAgenda?: boolean;
}
