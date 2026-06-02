import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/constants';
import { Job } from 'bullmq';

@Processor(QUEUES.REPORTING)
export class ReportingWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}

