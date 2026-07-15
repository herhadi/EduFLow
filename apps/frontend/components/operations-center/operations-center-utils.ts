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
