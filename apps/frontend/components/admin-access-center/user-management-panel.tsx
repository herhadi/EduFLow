import { type FormEvent } from 'react';
import { type AppUser } from '../../lib/api';
import { roleCards, type NewUserForm } from './admin-access-center-utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { fieldClass } from '../ui/form';
import { SurfaceCard } from '../ui/card';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

type UserManagementPanelProps = {
  newUser: NewUserForm;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
  onDeactivateUser: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
  onNewUserChange: (field: keyof NewUserForm, value: string) => void;
  onResetUserPassword: (user: AppUser) => void;
  userActionState: ActionState;
  userMessage: string;
  users: AppUser[];
};

export function UserManagementPanel({
  newUser,
  onCreateUser,
  onDeactivateUser,
  onDeleteUser,
  onNewUserChange,
  onResetUserPassword,
  userActionState,
  userMessage,
  users,
}: UserManagementPanelProps) {
  return (
    <SurfaceCard className="sm:p-6">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
          User Management
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Root Menentukan Admin</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Buat user pertama untuk `operator_sekolah`. Password akun baru memakai default dari environment dan wajib diganti saat login pertama.
        </p>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={onCreateUser}>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={fieldClass}
            onChange={(event) => onNewUserChange('name', event.target.value)}
            placeholder="Nama lengkap"
            type="text"
            value={newUser.name}
          />
          <input
            className={fieldClass}
            onChange={(event) => onNewUserChange('username', event.target.value)}
            placeholder="Username"
            type="text"
            value={newUser.username}
          />
          <input
            className={fieldClass}
            onChange={(event) => onNewUserChange('email', event.target.value)}
            placeholder="Email (opsional)"
            type="email"
            value={newUser.email}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className={`${fieldClass} sm:min-w-64`}
            onChange={(event) => onNewUserChange('role', event.target.value)}
            value={newUser.role}
          >
            {roleCards.map((role) => (
              <option key={role.role} value={role.role}>
                {role.label}
              </option>
            ))}
          </select>
          <Button
            disabled={
              userActionState === 'loading' ||
              !newUser.username.trim() ||
              !newUser.name.trim()
            }
            type="submit"
          >
            {userActionState === 'loading' ? 'Membuat...' : 'Buat User'}
          </Button>
        </div>
      </form>

      {userMessage ? (
        <div
          className={[
            'mt-4 rounded-2xl border p-4 text-sm font-semibold',
            userActionState === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
          ].join(' ')}
        >
          {userMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {users.map((user) => (
          <article className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={user.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100">{user.name}</h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {user.username ?? '-'} · {user.email}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {user.roles.map((role) => (
                    <Badge key={role} tone="brand">
                      {role}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <Button
                    disabled={userActionState === 'loading'}
                    onClick={() => void onResetUserPassword(user)}
                    size="sm"
                    variant="outline"
                  >
                    Reset
                  </Button>
                  <Button
                    className="border-amber-200 text-amber-800 hover:border-amber-300 hover:text-amber-900 dark:border-amber-400/30 dark:text-amber-100"
                    disabled={userActionState === 'loading'}
                    onClick={() => void onDeactivateUser(user)}
                    size="sm"
                    variant="outline"
                  >
                    Nonaktif
                  </Button>
                  <Button
                    disabled={userActionState === 'loading'}
                    onClick={() => void onDeleteUser(user)}
                    size="sm"
                    variant="danger"
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {!users.length ? (
          <EmptyState title="Daftar user hanya muncul setelah login sebagai root." />
        ) : null}
      </div>
    </SurfaceCard>
  );
}
