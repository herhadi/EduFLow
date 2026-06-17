import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeInitialPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  newPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  repeatPassword!: string;
}
