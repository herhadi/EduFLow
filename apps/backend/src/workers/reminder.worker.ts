import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/constants';
import { Job } from 'bullmq';

@Processor(QUEUES.REMINDER)
export class ReminderWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}

