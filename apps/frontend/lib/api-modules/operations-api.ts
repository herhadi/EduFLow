import { download, downloadPost, request, restoreBackup } from '../api-client';
import type { ApiResponse, OperationsBackups, OperationsDashboard, R2StorageDeleteResult, R2StorageRangePreview, R2StorageUsage, TelegramOperationsStatus } from '../api-types';

export const operationsApi = {
  getOperationsDashboard: () =>
    request<ApiResponse<OperationsDashboard>>('/operations/dashboard'),
  getOperationsTelegram: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram'),
  setOperationsTelegramWebhook: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram/webhook', {
      method: 'POST',
    }),
  deleteOperationsTelegramWebhook: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram/webhook/delete', {
      method: 'POST',
    }),
  getOperationsBackups: () => request<ApiResponse<OperationsBackups>>('/operations/backups'),
  createDailyBackup: () => download('/operations/backups/daily'),
  restoreDailyBackup: (file: File) => restoreBackup<ApiResponse<{ filename: string }>>(file),
  createAcademicYearBackup: (schoolYearId: string) => request<ApiResponse<{ filename: string }>>('/operations/backups/academic-year', { method: 'POST', body: JSON.stringify({ schoolYearId }) }),
  getR2Usage: () => request<ApiResponse<R2StorageUsage>>('/operations/storage/usage'),
  listR2Objects: (from: string, to: string, prefix?: string) => {
    const query = new URLSearchParams({ from, to });
    if (prefix?.trim()) query.set('prefix', prefix.trim());
    return request<ApiResponse<R2StorageRangePreview>>(`/operations/storage/objects?${query.toString()}`);
  },
  downloadR2Backup: (from: string, to: string, prefix?: string) =>
    downloadPost('/operations/storage/backup', { from, to, ...(prefix?.trim() ? { prefix: prefix.trim() } : {}) }, `eduflow-r2-${from}-to-${to}.zip`),
  deleteR2Range: (payload: { from: string; to: string; prefix?: string; confirmation: string; expectedCount: number; expectedSizeBytes: number }) =>
    request<ApiResponse<R2StorageDeleteResult>>('/operations/storage/delete', { method: 'POST', body: JSON.stringify(payload) }),
  retryJob: (queueName: string, jobId: string) =>
    request<ApiResponse<{ queueName: string; jobId: string }>>(
      '/operations/jobs/retry',
      {
        method: 'POST',
        body: JSON.stringify({ queueName, jobId }),
      },
    ),
  discardJob: (queueName: string, jobId: string) =>
    request<ApiResponse<{ queueName: string; jobId: string }>>(
      '/operations/jobs/discard',
      {
        method: 'POST',
        body: JSON.stringify({ queueName, jobId }),
      },
    ),
};
