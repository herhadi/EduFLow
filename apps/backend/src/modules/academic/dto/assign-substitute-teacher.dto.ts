import { IsOptional, IsUUID } from 'class-validator';

export class AssignSubstituteTeacherDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string | null;
}
