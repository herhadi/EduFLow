import { Module } from '@nestjs/common';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { AcademicPlanningController } from './academic-planning.controller';
import { AcademicPlanningService } from './academic-planning.service';

@Module({ imports: [AuditModule, StorageModule, NotificationModule], controllers: [AcademicPlanningController], providers: [AcademicPlanningService] })
export class AcademicPlanningModule {}
