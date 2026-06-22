import { Matches } from 'class-validator';

export const schoolYearNameRegex = /^[0-9]{4}\/[0-9]{4}$/;

export class CreateSchoolYearDto {
  @Matches(schoolYearNameRegex)
  name!: string;
}
