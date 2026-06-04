import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  schoolYearId!: string;

  @IsUUID()
  semesterId!: string;

  @IsUUID()
  classId!: string;

  @IsUUID()
  subjectId!: string;

  @IsUUID()
  teacherId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startsAt!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endsAt!: string;
}
