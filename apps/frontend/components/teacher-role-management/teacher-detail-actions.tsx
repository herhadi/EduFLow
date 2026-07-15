import {
  type Teacher,
} from '../../lib/api';

type SaveState = 'idle' | 'loading' | 'success' | 'error';

type TeacherDetailActionsProps = {
  message: string;
  onResetPassword: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveState: SaveState;
  selectedTeacher: Teacher;
};

export function TeacherDetailActions({
  message,
  onResetPassword,
  onSave,
  saveDisabled,
  saveState,
  selectedTeacher,
}: TeacherDetailActionsProps) {
  return (
    <>
      {message ? (
        <div
          className={[
            'rounded-2xl border p-4 text-sm font-semibold',
            saveState === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-900',
          ].join(' ')}
        >
          {message}
        </div>
      ) : null}

      {selectedTeacher.user ? (
        <button
          className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 hover:bg-amber-100"
          onClick={() => void onResetPassword()}
          type="button"
        >
          Reset Password ke Default
        </button>
      ) : null}

      <button
        className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={saveDisabled}
        onClick={() => void onSave()}
        type="button"
      >
        {saveState === 'loading' ? 'Menyimpan...' : 'Simpan Pengaturan Guru'}
      </button>
    </>
  );
}
