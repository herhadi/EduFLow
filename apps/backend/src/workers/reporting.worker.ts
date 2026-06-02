import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.REPORT_DAILY)
export class ReportingWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}
