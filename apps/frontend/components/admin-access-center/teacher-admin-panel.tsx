import { type Teacher } from '../../lib/api';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { LoadingState } from '../ui/loading';
import { SearchInput } from '../ui/search';
import { SurfaceCard } from '../ui/card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type ActionState = 'idle' | 'loading' | 'success' | 'error';

type TeacherAdminPanelProps = {
  actionState: ActionState;
  filteredTeachers: Teacher[];
  loadState: LoadState;
  message: string;
  onDeactivateTeacher: (teacher: Teacher) => void;
  onDeleteTeacherPermanently: (teacher: Teacher) => void;
  onQueryChange: (value: string) => void;
  query: string;
};

export function TeacherAdminPanel({
  actionState,
  filteredTeachers,
  loadState,
  message,
  onDeactivateTeacher,
  onDeleteTeacherPermanently,
  onQueryChange,
  query,
}: TeacherAdminPanelProps) {
  return (
    <SurfaceCard className="sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            Teacher Admin
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">Nonaktifkan Guru</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Gunakan nonaktif, bukan hard delete, supaya histori akademik tetap utuh.
          </p>
        </div>
        <SearchInput
          className="sm:w-64"
          onChange={(event) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange('')}
          placeholder="Cari guru..."
          value={query}
        />
      </div>

      {message ? (
        <div
          className={[
            'mt-4 rounded-2xl border p-4 text-sm font-semibold',
            actionState === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
          ].join(' ')}
        >
          {message}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
          Data guru belum bisa dimuat. Pastikan backend berjalan di port `3001`.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {loadState === 'loading' ? (
          <LoadingState label="Memuat data guru..." />
        ) : null}

        {filteredTeachers.map((teacher) => (
          <article
            className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
            key={teacher.id}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-900 dark:text-slate-100">{teacher.name}</h3>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-muted sm:grid-cols-2">
                  <span>NIP: {teacher.nip ?? '-'}</span>
                  <span>HP: {teacher.phone ?? '-'}</span>
                  <span>Email: {teacher.email ?? '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  className="border-amber-200 text-amber-800 hover:border-amber-300 hover:text-amber-900 dark:border-amber-400/30 dark:text-amber-100"
                  disabled={actionState === 'loading'}
                  onClick={() => void onDeactivateTeacher(teacher)}
                  variant="outline"
                >
                  {actionState === 'loading' ? 'Proses...' : 'Nonaktif'}
                </Button>
                <Button
                  disabled={actionState === 'loading'}
                  onClick={() => void onDeleteTeacherPermanently(teacher)}
                  variant="danger"
                >
                  Hapus
                </Button>
              </div>
            </div>
          </article>
        ))}

        {loadState === 'success' && !filteredTeachers.length ? (
          <EmptyState title="Tidak ada guru aktif sesuai pencarian." />
        ) : null}
      </div>
    </SurfaceCard>
  );
}
