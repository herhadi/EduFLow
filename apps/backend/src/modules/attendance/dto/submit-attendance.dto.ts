import { AttendanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitAttendanceItemDto {
  @IsUUID()
  attendanceItemId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitAttendanceDto {
  @IsUUID()
  attendanceId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAttendanceItemDto)
  items!: SubmitAttendanceItemDto[];
}

