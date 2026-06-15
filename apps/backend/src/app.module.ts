import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CorrelationIdMiddleware } from './infrastructure/observability/correlation-id.middleware';
import { ErrorTrackingFilter } from './infrastructure/observability/error-tracking.filter';
import { RequestLoggingInterceptor } from './infrastructure/observability/request-logging.interceptor';
import { AcademicModule } from './modules/academic/academic.module';
import { AcademicPlanningModule } from './modules/academic-planning/academic-planning.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OperationsModule } from './modules/operations/operations.module';
import { ParentPortalModule } from './modules/parent-portal/parent-portal.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['apps/backend/.env', '.env'],
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    QueueModule,
    AuthModule,
    AcademicModule,
    AcademicPlanningModule,
    AttendanceModule,
    FinanceModule,
    HealthModule,
    NotificationModule,
    OperationsModule,
    ParentPortalModule,
    ReportingModule,
    SchedulerModule,
    AuditModule,
    WorkersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: ErrorTrackingFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
