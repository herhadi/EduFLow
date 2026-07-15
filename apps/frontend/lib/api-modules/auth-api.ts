import { request, upload } from '../api-client';
import type { ApiResponse, AppUser, AuthSession, LoginResult, MyProfile, TelegramLinkToken } from '../api-types';

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changeInitialPassword: (payload: {
    newPassword: string;
    repeatPassword: string;
  }) =>
    request<ApiResponse<LoginResult['user']>>('/auth/change-initial-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
  }) =>
    request<ApiResponse<null>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (payload: { username: string }) =>
    request<ApiResponse<null>>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: (refreshToken: string) =>
    request<ApiResponse<null>>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getSessions: () => request<ApiResponse<AuthSession[]>>('/auth/sessions'),
  revokeSessions: (refreshToken?: string) =>
    request<ApiResponse<null>>('/auth/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getMyProfile: () => request<ApiResponse<MyProfile>>('/auth/me/profile'),
  updateMyProfile: (payload: { name?: string }) =>
    request<ApiResponse<MyProfile>>('/auth/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadMyProfilePhoto: (file: File) =>
    upload<ApiResponse<MyProfile>>('/auth/me/profile/photo', file),
  createTelegramLinkToken: () =>
    request<ApiResponse<TelegramLinkToken>>('/auth/me/telegram/link-token', {
      method: 'POST',
    }),
  getUsers: () => request<ApiResponse<AppUser[]>>('/auth/users'),
  createUser: (payload: {
    email?: string;
    username: string;
    name: string;
    password?: string;
    roles: string[];
  }) =>
    request<ApiResponse<AppUser>>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deactivateUser: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}/deactivate`, {
      method: 'PATCH',
    }),
  resetUserPassword: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}/reset-password`, {
      method: 'POST',
    }),
  deleteUser: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}`, {
      method: 'DELETE',
    }),
};
