import { ClassTimeSlotActivityType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateClassTimeSlotActivityDto {
  @IsEnum(ClassTimeSlotActivityType)
  type!: ClassTimeSlotActivityType;
}
