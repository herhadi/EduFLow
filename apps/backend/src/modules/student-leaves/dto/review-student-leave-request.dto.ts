import { StudentLeaveRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewStudentLeaveRequestDto {
  @IsEnum(StudentLeaveRequestStatus)
  status!: StudentLeaveRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
