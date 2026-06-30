import { IsString } from 'class-validator';

export class ConfirmTelegramLinkDto {
  @IsString()
  token!: string;

  @IsString()
  telegramId!: string;
}
