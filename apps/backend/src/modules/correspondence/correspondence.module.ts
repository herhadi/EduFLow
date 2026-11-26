import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
@Module({ imports: [AuditModule], controllers: [CorrespondenceController], providers: [CorrespondenceService] })
export class CorrespondenceModule {}
