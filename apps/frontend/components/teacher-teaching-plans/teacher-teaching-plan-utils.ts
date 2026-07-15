import { type TeachingPlan, type TeachingPlanType } from '../../lib/api';

export const planTypes: Array<{ value: TeachingPlanType; label: string }> = [
  { value: 'ANNUAL_PROGRAM', label: 'Program Tahunan' },
  { value: 'SEMESTER_PROGRAM', label: 'Program Semester' },
  { value: 'KKTP', label: 'KKTP' },
  { value: 'LESSON_PLAN', label: 'Perencanaan Pembelajaran' },
  { value: 'TEACHING_BOOK', label: 'Buku KBM' },
];

export const documentAccept = '.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
export const bookPhotoAccept = 'image/jpeg,image/png,image/webp';

export function getPlanTypeLabel(type: TeachingPlanType) {
  return planTypes.find((item) => item.value === type)?.label ?? type;
}

export function getRevisionPriorityLabel(priority: TeachingPlan['reviewPriority']) {
  if (priority === 'HIGH') return 'Tinggi';
  if (priority === 'LOW') return 'Rendah';
  return 'Sedang';
}

export function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.ceil(size / 1024)} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function getAttachmentAccept(type: TeachingPlanType) {
  return type === 'TEACHING_BOOK' ? bookPhotoAccept : documentAccept;
}

export function hasPlanAttachment(plan: TeachingPlan) {
  return Boolean(plan.attachmentKey || plan.attachmentUrl);
}
