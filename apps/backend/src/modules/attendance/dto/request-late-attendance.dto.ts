import { IsOptional, IsString } from 'class-validator';

export class RequestLateAttendanceDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
