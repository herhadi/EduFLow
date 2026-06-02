import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/constants';
import { Job } from 'bullmq';

@Processor(QUEUES.NOTIFICATION)
export class NotificationWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}

