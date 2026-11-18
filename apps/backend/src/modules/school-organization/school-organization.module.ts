import { Module } from '@nestjs/common';
import { SchoolOrganizationController } from './school-organization.controller';
import { SchoolOrganizationService } from './school-organization.service';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({ imports: [StorageModule], controllers: [SchoolOrganizationController], providers: [SchoolOrganizationService] })
export class SchoolOrganizationModule {}
