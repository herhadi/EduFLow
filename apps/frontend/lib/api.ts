import { academicApi } from './api-modules/academic-api';
import { authApi } from './api-modules/auth-api';
import { gradesApi } from './api-modules/grades-api';
import { importExportApi } from './api-modules/import-export-api';
import { notificationApi } from './api-modules/notification-api';
import { operationsApi } from './api-modules/operations-api';
import { parentApi } from './api-modules/parent-api';
import { planningApi } from './api-modules/planning-api';
import { reportingApi } from './api-modules/reporting-api';
import { scheduleApi } from './api-modules/schedule-api';

export type * from './api-types';

export const api = {
  ...authApi,
  ...academicApi,
  ...planningApi,
  ...gradesApi,
  ...scheduleApi,
  ...notificationApi,
  ...reportingApi,
  ...operationsApi,
  ...importExportApi,
  ...parentApi,
};
