import { TeacherAssignmentStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class SetTeacherSchoolYearAssignmentDto {
  @IsEnum(TeacherAssignmentStatus)
  status!: TeacherAssignmentStatus;

  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds!: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
