import { IsUUID } from 'class-validator';

export class OpenClassDto {
  @IsUUID()
  agendaId!: string;
}

