import { Injectable } from '@nestjs/common';

type RequestMetric = {
  durationMs: number;
  error?: string;
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
    const errorsLastMinute = lastMinute.filter((metric): metric is RequestMetric & { statusCode: number } =>
      typeof metric.statusCode === 'number' && metric.statusCode >= 400,
    );
    const clientErrorsLastMinute = errorsLastMinute.filter((metric) => metric.statusCode < 500);
    const serverErrorsLastMinute = errorsLastMinute.filter((metric) => metric.statusCode >= 500);
    const averageDurationMs = lastMinute.length
      ? Math.round(lastMinute.reduce((total, metric) => total + metric.durationMs, 0) / lastMinute.length)
      : 0;
    const recentErrors = this.metrics
      .filter((metric): metric is RequestMetric & { statusCode: number } =>
        typeof metric.statusCode === 'number' && metric.statusCode >= 400,
      )
      .slice(-8)
      .reverse()
      .map((metric) => ({
        durationMs: metric.durationMs,
        error: metric.error,
        method: metric.method,
        path: metric.path,
        recordedAt: new Date(metric.recordedAt).toISOString(),
        statusCode: metric.statusCode,
      }));

    return {
      windowSeconds: Math.round(METRIC_WINDOW_MS / 1000),
      requestsPerMinute: lastMinute.length,
      errorsPerMinute: errorsLastMinute.length,
      clientErrorsPerMinute: clientErrorsLastMinute.length,
      serverErrorsPerMinute: serverErrorsLastMinute.length,
      averageDurationMs,
      recentRequests: this.metrics.length,
      recentErrors,
    };
  }

  private prune(now: number) {
    this.metrics = this.metrics.filter((metric) => metric.recordedAt >= now - METRIC_WINDOW_MS);
  }
}
