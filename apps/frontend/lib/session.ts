import type { LoginResult } from './api';

export const SESSION_CHANGED_EVENT = 'eduflow:session-changed';

export type CurrentSessionUser = LoginResult['user'];

export function saveSession(session: LoginResult) {
  localStorage.setItem('accessToken', session.accessToken);
  localStorage.setItem('refreshToken', session.refreshToken);
  localStorage.setItem('sessionExpiresAt', session.expiresAt);
  localStorage.setItem('currentUser', JSON.stringify(session.user));
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

export function getCurrentSessionUser(): CurrentSessionUser | null {
  const storedUser = localStorage.getItem('currentUser');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as CurrentSessionUser;
  } catch {
    localStorage.removeItem('currentUser');
    return null;
  }
}

export function clearBrowserSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('sessionExpiresAt');
  localStorage.removeItem('currentUser');
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}
