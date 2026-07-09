import { AttendanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

  @IsOptional()
  @IsBoolean()
  teacherPresent?: boolean;

  @IsOptional()
  @IsBoolean()
  studentAttendanceDone?: boolean;

  @IsOptional()
  @IsBoolean()
  materialFilled?: boolean;

  @IsOptional()
  @IsBoolean()
  classPhotoDone?: boolean;

  @IsOptional()
  @IsString()
  issueNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAttendanceItemDto)
  items!: SubmitAttendanceItemDto[];
}
