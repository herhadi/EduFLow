import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class DecideOutgoingLetterDto {
  @IsIn(['APPROVED', 'REVISION_REQUESTED']) status!: 'APPROVED' | 'REVISION_REQUESTED';
  @IsOptional() @IsString() @MaxLength(2000) revisionNote?: string;
}
