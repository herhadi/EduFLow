import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';

@Processor(QUEUES.REPORT_DAILY)
export class ReportingWorker extends WorkerHost {
  private readonly logger = new Logger(ReportingWorker.name);

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      this.logJob('queue.job.completed', job);
      return undefined;
    } catch (error) {
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private logJob(event: string, job: Job, error?: unknown) {
    this.logger[error ? 'error' : 'log'](
      JSON.stringify({
        event,
        queueName: QUEUES.REPORT_DAILY,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
