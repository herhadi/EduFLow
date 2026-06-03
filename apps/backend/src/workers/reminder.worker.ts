import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.TEACHER_REMINDER)
export class ReminderWorker extends WorkerHost {
  async process(job: Job) {
    return {
      processed: true,
      jobName: job.name,
      message: 'Reminder guru diproses.',
    };
  }
}
