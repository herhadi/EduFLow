import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AcademicPlanningController } from './academic-planning.controller';
import { AcademicPlanningService } from './academic-planning.service';

@Module({ imports: [AuditModule], controllers: [AcademicPlanningController], providers: [AcademicPlanningService] })
export class AcademicPlanningModule {}
