import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;
}
