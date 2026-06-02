import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.NOTIFICATION_SEND)
export class NotificationWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}
