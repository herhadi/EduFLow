import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
