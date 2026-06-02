import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.ATTENDANCE_SUMMARY)
export class SummaryWorker extends WorkerHost {
  async process(_job: Job) {
    return undefined;
  }
}
