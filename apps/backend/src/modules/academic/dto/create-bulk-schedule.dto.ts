import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateBulkScheduleDto {
  @IsUUID()
  schoolYearId!: string;

  @IsUUID()
  semesterId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  classIds!: string[];

  @IsUUID()
  subjectId!: string;

  @IsUUID()
  teacherId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  timeSlotIds!: string[];
}
