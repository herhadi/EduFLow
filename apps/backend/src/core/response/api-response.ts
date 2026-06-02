import { ApiResponse } from '@eduflow/shared';

export function createApiResponse<T>(
  data: T,
  message?: string,
): ApiResponse<T> {
  return { data, message };
}
