import { type OperationsBackups, type OperationsDashboard } from '../../lib/api';

export const emptyOperationsDashboard: OperationsDashboard = {
  health: {
    redis: 'Unhealthy',
    queue: 'Unhealthy',
    worker: 'Unhealthy',
    database: 'Unhealthy',
    notification: 'Unhealthy',
    storage: 'Unhealthy',
  },
  diagnostics: {
    databaseLatencyMs: null,
    redisLatencyMs: null,
  },
  runtime: {
    uptimeSeconds: 0,
    cpu: {
      count: 0,
      loadAverage1m: 0,
      loadPercent: 0,
    },
    memory: {
      processRssBytes: 0,
      heapUsedBytes: 0,
      heapTotalBytes: 0,
      systemTotalBytes: 0,
      systemFreeBytes: 0,
      systemUsedPercent: 0,
    },
  },
  requests: {
    windowSeconds: 300,
    requestsPerMinute: 0,
    errorsPerMinute: 0,
    averageDurationMs: 0,
    recentRequests: 0,
  },
  queueTotals: {
    waiting: 0,
    active: 0,
    failed: 0,
    delayed: 0,
    completed: 0,
    notification: null,
    attendance: null,
    reminder: null,
    report: null,
  },
  queues: [],
  failedJobs: [],
  storageSummary: null,
  storageError: null,
};

export const emptyOperationsBackups: OperationsBackups = {
  daily: [],
  academicYears: [],
};

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

export function formatLatency(value?: number | null) {
  return typeof value === 'number' ? `${value} ms` : '-';
}
