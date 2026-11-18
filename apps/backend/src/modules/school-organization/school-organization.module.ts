import { Module } from '@nestjs/common';
import { SchoolOrganizationController } from './school-organization.controller';
import { SchoolOrganizationService } from './school-organization.service';

@Module({ controllers: [SchoolOrganizationController], providers: [SchoolOrganizationService] })
export class SchoolOrganizationModule {}
