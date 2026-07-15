import { type TeachingPlan } from '../../lib/api';
import { Badge } from '../ui/badge';

const labels: Record<TeachingPlan['status'], string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Review',
  REVISION_REQUESTED: 'Perlu Revisi',
  APPROVED: 'Disetujui',
  ARCHIVED: 'Diarsipkan',
};

const tones: Record<TeachingPlan['status'], 'brand' | 'default' | 'muted' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'brand',
  REVISION_REQUESTED: 'warning',
  APPROVED: 'success',
  ARCHIVED: 'muted',
};

export function TeachingPlanStatus({ status }: { status: TeachingPlan['status'] }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
