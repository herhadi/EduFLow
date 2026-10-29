import { Module } from '@nestjs/common';
import { ExtracurricularController } from './extracurricular.controller';
import { ExtracurricularService } from './extracurricular.service';

@Module({ controllers: [ExtracurricularController], providers: [ExtracurricularService] })
export class ExtracurricularModule {}
