import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { TelegramModule } from '../../infrastructure/telegram/telegram.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuditModule, StorageModule, TelegramModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
