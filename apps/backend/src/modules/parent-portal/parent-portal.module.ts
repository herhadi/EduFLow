import { Module } from '@nestjs/common';
import { ParentPortalController } from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';

@Module({
  controllers: [ParentPortalController],
  providers: [ParentPortalService],
})
export class ParentPortalModule {}
