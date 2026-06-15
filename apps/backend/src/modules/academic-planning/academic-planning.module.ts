import { Module } from '@nestjs/common';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { AcademicPlanningController } from './academic-planning.controller';
import { AcademicPlanningService } from './academic-planning.service';

@Module({ imports: [AuditModule, StorageModule], controllers: [AcademicPlanningController], providers: [AcademicPlanningService] })
export class AcademicPlanningModule {}
