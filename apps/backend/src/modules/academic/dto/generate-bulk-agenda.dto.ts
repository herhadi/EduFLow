import { IsArray, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GenerateBulkAgendaDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  classIds?: string[];

  @IsOptional()
  @IsUUID()
  schoolYearId?: string;
}
