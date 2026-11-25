import { IsDateString } from 'class-validator';

export class UpdateSemesterDatesDto {
  @IsDateString({ strict: true })
  startsAt!: string;

  @IsDateString({ strict: true })
  endsAt!: string;
}
