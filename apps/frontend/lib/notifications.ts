import { api, type NotificationLog } from './api';

export const NOTIFICATION_CHANGED_EVENT = 'eduflow-notification-changed';

export function dispatchNotificationChanged() {
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

export function getUnreadNotificationCount(items: NotificationLog[]) {
  return items.filter((notification) => !notification.readAt).length;
}

export async function loadUnreadNotificationCount() {
  const response = await api.getMyNotifications();

  return getUnreadNotificationCount(response.data);
}
