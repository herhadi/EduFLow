import { type FormEvent, useState } from 'react';
import { type AppUser } from '../../lib/api';
import { roleCards, type NewUserForm } from './admin-access-center-utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { fieldClass } from '../ui/form';
import { SurfaceCard } from '../ui/card';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

type UserManagementPanelProps = {
  canAssignRootRole?: boolean;
  newUser: NewUserForm;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
  onDeactivateUser: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
  onNewUserChange: (field: keyof NewUserForm, value: string) => void;
  onResetUserPassword: (user: AppUser) => void;
  onUpdateUserRoles: (user: AppUser, roles: string[]) => void;
  userActionState: ActionState;
  userMessage: string;
  users: AppUser[];
};

export function UserManagementPanel({
  canAssignRootRole = false,
  newUser,
  onCreateUser,
  onDeactivateUser,
  onDeleteUser,
  onNewUserChange,
  onResetUserPassword,
  onUpdateUserRoles,
  userActionState,
  userMessage,
  users,
}: UserManagementPanelProps) {
  const assignableRoleCards = roleCards.filter((role) => canAssignRootRole || role.role !== 'root');
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});

  return (
    <SurfaceCard className="sm:p-6">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
          User Management
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Pengelolaan Akun Sekolah</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Buat akun sekolah dan pilih peran sesuai tugasnya. Pemberian role Root hanya dapat dilakukan oleh Root; password awal mengikuti konfigurasi server dan wajib diganti saat login pertama.
        </p>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={onCreateUser}>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={fieldClass} onChange={(event) => onNewUserChange('name', event.target.value)} placeholder="Nama lengkap" type="text" value={newUser.name} />
          <input className={fieldClass} onChange={(event) => onNewUserChange('username', event.target.value)} placeholder="Username" type="text" value={newUser.username} />
          <input className={fieldClass} onChange={(event) => onNewUserChange('email', event.target.value)} placeholder="Email (opsional)" type="email" value={newUser.email} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className={`${fieldClass} sm:min-w-64`} onChange={(event) => onNewUserChange('role', event.target.value)} value={newUser.role}>
            {assignableRoleCards.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
          </select>
          <Button disabled={userActionState === 'loading' || !newUser.username.trim() || !newUser.name.trim()} type="submit">
            {userActionState === 'loading' ? 'Membuat...' : 'Buat User'}
          </Button>
        </div>
      </form>

      {userMessage ? (
        <div className={['mt-4 rounded-2xl border p-4 text-sm font-semibold', userActionState === 'success'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100'].join(' ')}>
          {userMessage}
        </div>
      ) : null}

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100">
          Keterangan dan tugas masing-masing role
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {roleCards.map((role) => (
            <div className="min-w-0 border-t border-slate-200 pt-2 dark:border-slate-700" key={role.role}>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{role.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{role.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Root dan Super Admin Sekolah dapat mengubah role. Super Admin Sekolah tidak dapat memberikan role Root.</p>
      </details>

      <div className="mt-5 grid gap-3">
        {users.map((user) => {
          const rolesForUser = selectedRoles[user.id] ?? user.roles;
          const rolesChanged = rolesForUser.length !== user.roles.length || !rolesForUser.every((role) => user.roles.includes(role));
          const availableRoles = assignableRoleCards.filter((role) => !rolesForUser.includes(role.role));

          return (
            <article className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={user.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100">{user.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted">{user.username ?? '-'} · {user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.map((role) => <Badge key={role} tone="brand">{role}</Badge>)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                  <Button disabled={userActionState === 'loading'} onClick={() => void onResetUserPassword(user)} size="sm" variant="outline">Reset</Button>
                  <Button className="border-amber-200 text-amber-800 hover:border-amber-300 hover:text-amber-900 dark:border-amber-400/30 dark:text-amber-100" disabled={userActionState === 'loading'} onClick={() => void onDeactivateUser(user)} size="sm" variant="outline">Nonaktif</Button>
                  <Button disabled={userActionState === 'loading'} onClick={() => void onDeleteUser(user)} size="sm" variant="danger">Hapus</Button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-700 sm:flex-row sm:items-center">
                <select
                  aria-label={`Tambah role untuk ${user.name}`}
                  className={`${fieldClass} sm:max-w-xs`}
                  disabled={userActionState === 'loading' || !availableRoles.length}
                  onChange={(event) => {
                    const role = event.target.value;
                    if (!role) return;
                    setSelectedRoles((current) => ({ ...current, [user.id]: [...rolesForUser, role] }));
                  }}
                  value=""
                >
                  <option value="">Tambah role...</option>
                  {availableRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                </select>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {rolesForUser.map((roleName) => {
                    const role = roleCards.find((item) => item.role === roleName);
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-100" key={roleName}>
                        {role?.label ?? roleName}
                        <button aria-label={`Hapus role ${role?.label ?? roleName}`} className="ml-1 rounded-full px-1 hover:bg-brand-100 dark:hover:bg-brand-500/20" disabled={userActionState === 'loading' || (!canAssignRootRole && roleName === 'root')} onClick={() => setSelectedRoles((current) => ({ ...current, [user.id]: rolesForUser.filter((item) => item !== roleName) }))} type="button">×</button>
                      </span>
                    );
                  })}
                </div>
                <Button disabled={userActionState === 'loading' || !rolesForUser.length || !rolesChanged} onClick={() => onUpdateUserRoles(user, rolesForUser)} size="sm" variant="outline">
                  Simpan Role
                </Button>
              </div>
            </article>
          );
        })}
        {!users.length ? <EmptyState title="Daftar user hanya muncul setelah login sebagai root." /> : null}
      </div>
    </SurfaceCard>
  );
}
