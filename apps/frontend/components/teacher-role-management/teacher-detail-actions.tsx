import {
  type Teacher,
} from '../../lib/api';
import { Button } from '../ui/button';

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
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
          ].join(' ')}
        >
          {message}
        </div>
      ) : null}

      {selectedTeacher.user ? (
        <Button
          className="w-full border-amber-300 text-amber-900 hover:border-amber-400 hover:text-amber-900 dark:border-amber-400/30 dark:text-amber-100"
          onClick={() => void onResetPassword()}
          variant="outline"
        >
          Reset Password ke Default
        </Button>
      ) : null}

      <Button
        className="w-full"
        disabled={saveDisabled}
        onClick={() => void onSave()}
        size="lg"
      >
        {saveState === 'loading' ? 'Menyimpan...' : 'Simpan Pengaturan Guru'}
      </Button>
    </>
  );
}
