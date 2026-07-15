import { Injectable } from '@nestjs/common';

type RequestMetric = {
  durationMs: number;
  method: string;
  path: string;
  recordedAt: number;
  statusCode: number | 'OK';
};

const METRIC_WINDOW_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

@Injectable()
export class RequestMetricsService {
  private metrics: RequestMetric[] = [];

  record(input: Omit<RequestMetric, 'recordedAt'>) {
    const now = Date.now();
    this.metrics.push({ ...input, recordedAt: now });
    this.prune(now);
  }

  getSnapshot() {
    const now = Date.now();
    this.prune(now);

    const lastMinute = this.metrics.filter((metric) => metric.recordedAt >= now - ONE_MINUTE_MS);
    const errorsLastMinute = lastMinute.filter((metric) =>
      typeof metric.statusCode === 'number' && metric.statusCode >= 400,
    );
    const averageDurationMs = lastMinute.length
      ? Math.round(lastMinute.reduce((total, metric) => total + metric.durationMs, 0) / lastMinute.length)
      : 0;

    return {
      windowSeconds: Math.round(METRIC_WINDOW_MS / 1000),
      requestsPerMinute: lastMinute.length,
      errorsPerMinute: errorsLastMinute.length,
      averageDurationMs,
      recentRequests: this.metrics.length,
    };
  }

  private prune(now: number) {
    this.metrics = this.metrics.filter((metric) => metric.recordedAt >= now - METRIC_WINDOW_MS);
  }
}
