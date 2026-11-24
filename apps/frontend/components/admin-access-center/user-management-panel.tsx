import { type FormEvent, useState } from 'react';
import { type NewUserForm, roleCards } from './admin-access-center-utils';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { fieldClass } from '../ui/form';

type ActionState = 'idle' | 'loading' | 'success' | 'error';
type UserManagementPanelProps = {
  canAssignRootRole?: boolean;
  bootstrapOnly?: boolean;
  newUser: NewUserForm;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
  onNewUserChange: (field: keyof NewUserForm, value: string) => void;
  onProvisionTeacherAccounts: () => void;
  userActionState: ActionState;
  userMessage: string;
};

export function UserManagementPanel({
  canAssignRootRole = false, bootstrapOnly = false, newUser, onCreateUser,
  onNewUserChange, onProvisionTeacherAccounts, userActionState, userMessage,
}: UserManagementPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const assignableRoles = roleCards.filter((role) => canAssignRootRole || role.role !== 'root');
  const creationRoles = bootstrapOnly
    ? roleCards.filter((role) => ['super admin', 'operator_sekolah'].includes(role.role))
    : assignableRoles;

  function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    onCreateUser(event);
    if (newUser.name.trim() && newUser.username.trim()) setShowCreateDialog(false);
  }

  return (
    <section className="mb-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-ink">Pengelolaan Akun</h2>
          <p className="mt-1 text-sm text-muted">Tambah akun dan siapkan akses pengguna. Pengelolaan akun tersedia dari daftar di bawah.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button disabled={userActionState === 'loading'} onClick={onProvisionTeacherAccounts} className="min-h-11 w-full px-4 text-sm sm:w-auto" size="md" variant="outline">
            {userActionState === 'loading' ? 'Memproses...' : 'Buat Akun Login Guru'}
          </Button>
          <Button disabled={userActionState === 'loading'} onClick={() => setShowCreateDialog(true)} className="min-h-11 w-full px-4 text-sm sm:w-auto" size="md">
            + Tambah Akun
          </Button>
        </div>
      </div>
      {userMessage ? <p aria-live="polite" className={`mt-2 text-xs ${userActionState === 'error' ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{userMessage}</p> : null}
      <details className="mt-2 border-t border-slate-100 pt-2 dark:border-[var(--border)]">
        <summary className="cursor-pointer text-xs font-semibold text-muted">Keterangan tugas dan kewenangan role</summary>
        <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {assignableRoles.map((role) => (
            <div className="min-w-0" key={role.role}>
              <p className="text-xs font-bold text-ink">{role.label}</p>
              <p className="text-xs leading-5 text-muted">{role.description}</p>
            </div>
          ))}
        </div>
      </details>
      <Dialog
        className="max-w-xl"
        description="Masukkan identitas pengguna dan tentukan role awalnya."
        onClose={() => setShowCreateDialog(false)}
        open={showCreateDialog}
        title="Tambah Akun"
      >
        <form className="grid gap-4" onSubmit={submitCreateUser}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-muted">Nama lengkap
              <input autoFocus className={fieldClass} onChange={(event) => onNewUserChange('name', event.target.value)} placeholder="Nama lengkap" type="text" value={newUser.name} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Username
              <input className={fieldClass} onChange={(event) => onNewUserChange('username', event.target.value)} placeholder="Username" type="text" value={newUser.username} />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-muted">Email (opsional)
            <input className={fieldClass} onChange={(event) => onNewUserChange('email', event.target.value)} placeholder="nama@sekolah.sch.id" type="email" value={newUser.email} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Role awal
            <select className={fieldClass} onChange={(event) => onNewUserChange('role', event.target.value)} value={newUser.role}>
              {creationRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-[var(--border)] sm:flex sm:justify-end">
            <Button className="min-h-11 w-full px-5 sm:w-auto" onClick={() => setShowCreateDialog(false)} size="md" variant="outline">Batal</Button>
            <Button className="min-h-11 w-full px-5 sm:w-auto" disabled={userActionState === 'loading' || !newUser.username.trim() || !newUser.name.trim()} size="md" type="submit" variant="success">
              {userActionState === 'loading' ? 'Menyimpan...' : 'Simpan Akun'}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
