import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveAssessmentScoreItemDto {
  @IsUUID()
  scoreId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  score?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class SaveAssessmentScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAssessmentScoreItemDto)
  scores!: SaveAssessmentScoreItemDto[];
}
