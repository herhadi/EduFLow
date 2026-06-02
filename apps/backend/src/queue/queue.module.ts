import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from '@eduflow/shared';
import { createRedisConnection } from '../config/redis.config';

const queueRegistrations = Object.values(QUEUES).map((name) => ({ name }));

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: createRedisConnection(configService),
      }),
    }),
    BullModule.registerQueue(...queueRegistrations),
  ],
  exports: [BullModule],
})
export class QueueModule {}
