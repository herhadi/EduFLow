import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.TEACHER_REMINDER)
export class ReminderWorker extends WorkerHost {
  private readonly logger = new Logger(ReminderWorker.name);

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      const result = {
        processed: true,
        jobName: job.name,
        message: 'Reminder guru diproses.',
      };

      this.logJob('queue.job.completed', job);
      return result;
    } catch (error) {
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private logJob(event: string, job: Job, error?: unknown) {
    this.logger[error ? 'error' : 'log'](
      JSON.stringify({
        event,
        queueName: QUEUES.TEACHER_REMINDER,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
