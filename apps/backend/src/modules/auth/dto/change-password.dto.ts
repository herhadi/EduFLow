import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  newPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  repeatPassword!: string;
}
