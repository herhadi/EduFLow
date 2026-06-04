import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.ATTENDANCE_SUMMARY)
export class SummaryWorker extends WorkerHost {
  private readonly logger = new Logger(SummaryWorker.name);

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      const result = {
        processed: true,
        jobName: job.name,
        message: 'Summary attendance diproses.',
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
        queueName: QUEUES.ATTENDANCE_SUMMARY,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
