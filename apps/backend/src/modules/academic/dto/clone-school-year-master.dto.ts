import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CloneSchoolYearMasterDto {
  @IsUUID()
  sourceSchoolYearId!: string;

  @IsUUID()
  targetSchoolYearId!: string;

  @IsOptional()
  @IsBoolean()
  includeClasses?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTimeSlots?: boolean;

  @IsOptional()
  @IsBoolean()
  includeClassActivities?: boolean;
}
