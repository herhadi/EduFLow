import { IsDateString } from 'class-validator';

export class GenerateAgendaDto {
  @IsDateString()
  date!: string;
}
