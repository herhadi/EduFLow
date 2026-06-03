import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from '@eduflow/shared';
import { defaultQueueJobOptions } from '../infrastructure/queue/queue-options';
import { createRedisConnection } from '../infrastructure/redis/redis.config';
import { QueueProducerService } from './queue-producer.service';

const queueRegistrations = Object.values(QUEUES).map((name) => ({ name }));

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: createRedisConnection(configService),
        defaultJobOptions: defaultQueueJobOptions,
      }),
    }),
    BullModule.registerQueue(...queueRegistrations),
  ],
  providers: [QueueProducerService],
  exports: [BullModule, QueueProducerService],
})
export class QueueModule {}
