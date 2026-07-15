import { type DailyAgenda } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type AgendaCardProps = {
  agenda: DailyAgenda;
  onOpen: (agenda: DailyAgenda) => void;
};

export function AgendaCard({ agenda, onOpen }: AgendaCardProps) {
  const isSubmitted =
    agenda.status === 'COMPLETED' ||
    Boolean(agenda.attendance?.submittedAt) ||
    ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'].includes(agenda.attendance?.state ?? '');
  const canOpen = !isSubmitted && agenda.canManageAttendance !== false;

  return (
    <article className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[2rem] p-5">
      <div>
        <p className="text-xs font-black text-brand-700">
          {agenda.schedule?.startsAt ?? 'Jam belum diatur'} · {agenda.class.name}
        </p>
        <h2 className="mt-1 text-lg font-black">{agenda.subject.name}</h2>
        {agenda.substituteTeacher ? (
          <p className="mt-1 text-xs font-black text-amber-700">
            Guru pengganti: {agenda.substituteTeacher.name}
          </p>
        ) : null}
        {isSubmitted ? (
          <Badge className="mt-2" tone="success">
            Presensi sudah selesai
          </Badge>
        ) : null}
        {!isSubmitted && agenda.canManageAttendance === false ? (
          <Badge className="mt-2" tone="warning">
            Presensi dialihkan ke guru pengganti
          </Badge>
        ) : null}
      </div>
      <Button disabled={!canOpen} onClick={() => void onOpen(agenda)}>
        {isSubmitted
          ? 'Sudah Submit'
          : agenda.canManageAttendance === false
            ? 'Dialihkan'
            : 'Buka Presensi'}
      </Button>
    </article>
  );
}
