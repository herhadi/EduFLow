import { type FormEvent } from 'react';
import { type AppUser } from '../../lib/api';
import { roleCards, type NewUserForm } from './admin-access-center-utils';

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
    <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
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
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
            onChange={(event) => onNewUserChange('name', event.target.value)}
            placeholder="Nama lengkap"
            type="text"
            value={newUser.name}
          />
          <input
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
            onChange={(event) => onNewUserChange('username', event.target.value)}
            placeholder="Username"
            type="text"
            value={newUser.username}
          />
          <input
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
            onChange={(event) => onNewUserChange('email', event.target.value)}
            placeholder="Email (opsional)"
            type="email"
            value={newUser.email}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-brand-600 focus:bg-white sm:min-w-64"
            onChange={(event) => onNewUserChange('role', event.target.value)}
            value={newUser.role}
          >
            {roleCards.map((role) => (
              <option key={role.role} value={role.role}>
                {role.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={
              userActionState === 'loading' ||
              !newUser.username.trim() ||
              !newUser.name.trim()
            }
            type="submit"
          >
            {userActionState === 'loading' ? 'Membuat...' : 'Buat User'}
          </button>
        </div>
      </form>

      {userMessage ? (
        <div
          className={[
            'mt-4 rounded-2xl border p-4 text-sm font-semibold',
            userActionState === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-900',
          ].join(' ')}
        >
          {userMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {users.map((user) => (
          <article className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4" key={user.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-black text-slate-900">{user.name}</h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {user.username ?? '-'} · {user.email}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {user.roles.map((role) => (
                    <span
                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700"
                      key={role}
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <button
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-brand-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={userActionState === 'loading'}
                    onClick={() => void onResetUserPassword(user)}
                    type="button"
                  >
                    Reset
                  </button>
                  <button
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={userActionState === 'loading'}
                    onClick={() => void onDeactivateUser(user)}
                    type="button"
                  >
                    Nonaktif
                  </button>
                  <button
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={userActionState === 'loading'}
                    onClick={() => void onDeleteUser(user)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {!users.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">
            Daftar user hanya muncul setelah login sebagai root.
          </p>
        ) : null}
      </div>
    </section>
  );
}
