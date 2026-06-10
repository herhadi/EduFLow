import { IsOptional, IsString } from 'class-validator';

export class SetClassHomeroomTeacherDto {
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
