import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.ATTENDANCE_SUMMARY)
export class SummaryWorker extends WorkerHost {
  async process(job: Job) {
    return {
      processed: true,
      jobName: job.name,
      message: 'Summary attendance diproses.',
    };
  }
}
