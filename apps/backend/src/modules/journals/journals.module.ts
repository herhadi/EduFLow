import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { JournalsController } from './journals.controller';
import { JournalsService } from './journals.service';
@Module({ imports: [AuditModule], controllers: [JournalsController], providers: [JournalsService] })
export class JournalsModule {}
