import { request } from '../api-client';
import type { ApiResponse, NotificationLog, NotificationRetryResult, NotificationTemplate } from '../api-types';

export const notificationApi = {
  getSentNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/sent'),
  getMyNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/mine'),
  markMyNotificationAsRead: (id: string) =>
    request<ApiResponse<NotificationLog>>(`/notifications/mine/${id}/read`, { method: 'PATCH' }),
  getFailedNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/failed'),
  getPendingNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/pending'),
  getRetryNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/failed'),
  retryNotification: (id: string) =>
    request<ApiResponse<NotificationRetryResult>>(`/notifications/retry/${id}`, {
      method: 'POST',
    }),
  getNotificationTemplates: () =>
    request<ApiResponse<NotificationTemplate[]>>('/notifications/templates'),
};
