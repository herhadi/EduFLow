import { StudentLeaveRequestType } from '@prisma/client';
import { IsDateString, IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateStudentLeaveRequestDto {
  @IsUUID()
  studentId!: string;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsEnum(StudentLeaveRequestType)
  type!: StudentLeaveRequestType;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
