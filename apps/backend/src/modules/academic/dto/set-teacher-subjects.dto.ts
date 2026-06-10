import { IsArray, IsString } from 'class-validator';

export class SetTeacherSubjectsDto {
  @IsArray()
  @IsString({ each: true })
  subjectIds!: string[];
}
