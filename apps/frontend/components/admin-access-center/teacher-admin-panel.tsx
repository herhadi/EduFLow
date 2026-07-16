import { type Teacher } from '../../lib/api';

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
    <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
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
        <input
          className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white sm:w-64"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari guru..."
          type="search"
          value={query}
        />
      </div>

      {message ? (
        <div
          className={[
            'mt-4 rounded-2xl border p-4 text-sm font-semibold',
            actionState === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-900',
          ].join(' ')}
        >
          {message}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Data guru belum bisa dimuat. Pastikan backend berjalan di port `3001`.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {loadState === 'loading' ? (
          <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-brand-700">
            Memuat data guru...
          </p>
        ) : null}

        {filteredTeachers.map((teacher) => (
          <article
            className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4"
            key={teacher.id}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-900">{teacher.name}</h3>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-muted sm:grid-cols-2">
                  <span>NIP: {teacher.nip ?? '-'}</span>
                  <span>HP: {teacher.phone ?? '-'}</span>
                  <span>Email: {teacher.email ?? '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={actionState === 'loading'}
                  onClick={() => void onDeactivateTeacher(teacher)}
                  type="button"
                >
                  {actionState === 'loading' ? 'Proses...' : 'Nonaktif'}
                </button>
                <button
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={actionState === 'loading'}
                  onClick={() => void onDeleteTeacherPermanently(teacher)}
                  type="button"
                >
                  Hapus
                </button>
              </div>
            </div>
          </article>
        ))}

        {loadState === 'success' && !filteredTeachers.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">
            Tidak ada guru aktif sesuai pencarian.
          </p>
        ) : null}
      </div>
    </section>
  );
}
