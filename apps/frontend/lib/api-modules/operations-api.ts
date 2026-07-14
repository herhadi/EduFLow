import { download, request, restoreBackup } from '../api-client';
import type { ApiResponse, OperationsBackups, OperationsDashboard, TelegramOperationsStatus } from '../api-types';

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
