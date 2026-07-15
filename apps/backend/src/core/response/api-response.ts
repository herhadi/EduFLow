import { ApiResponse } from '@eduflow/shared';

export function createApiResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    data,
    ...(message !== undefined ? { message } : {}),
    ...(meta !== undefined ? { meta } : {}),
  };
}

export const ok = createApiResponse;
