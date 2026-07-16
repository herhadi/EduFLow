import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { type Subject } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { fieldClass } from '../ui/form';

type SubjectFormState = {
  name: string;
  code: string;
};

type SubjectManagementPanelProps = {
  isSaving: boolean;
  onCreateSubject: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteSubject: (subject: Subject) => void;
  setSubjectForm: Dispatch<SetStateAction<SubjectFormState>>;
  subjectForm: SubjectFormState;
  subjects: Subject[];
};

export function SubjectManagementPanel({
  isSaving,
  onCreateSubject,
  onDeleteSubject,
  setSubjectForm,
  subjectForm,
  subjects,
}: SubjectManagementPanelProps) {
  return (
    <Card className="min-w-0 sm:p-6">
      <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Kurikulum</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Mata Pelajaran</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Daftar mapel bersifat fleksibel. Admin dapat menambah mapel lokal atau menghapus mapel yang belum dipakai.
      </p>

      <form className="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)_auto]" onSubmit={onCreateSubject}>
        <input
          className={fieldClass}
          onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Nama mata pelajaran"
          value={subjectForm.name}
        />
        <input
          className={`${fieldClass} uppercase`}
          onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
          placeholder="Kode"
          value={subjectForm.code}
        />
        <Button disabled={isSaving} type="submit">
          Tambah
        </Button>
      </form>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((subject) => (
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-blue-50 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900" key={subject.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{subject.name}</p>
              <p className="mt-1 text-xs font-bold text-muted">{subject.code ?? 'Tanpa kode'}</p>
            </div>
            <Button
              className="text-rose-700 hover:bg-rose-50 dark:text-rose-100 dark:hover:bg-rose-500/15"
              onClick={() => void onDeleteSubject(subject)}
              size="sm"
              variant="ghost"
            >
              Hapus
            </Button>
          </div>
        ))}
      </div>
      {!subjects.length ? (
        <EmptyState className="mt-5" title="Belum ada mata pelajaran." />
      ) : null}
    </Card>
  );
}
