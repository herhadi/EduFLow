import { type FormEvent, useMemo, useState } from 'react';
import { type AppUser } from '../../lib/api';
import { roleCards, type NewUserForm } from './admin-access-center-utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { fieldClass } from '../ui/form';
import { DEFAULT_PAGE_SIZE, Pagination } from '../ui/pagination';
import { SearchInput } from '../ui/search';
import { SurfaceCard } from '../ui/card';

type ActionState = 'idle' | 'loading' | 'success' | 'error';
type UserManagementPanelProps = {
  canAssignRootRole?: boolean;
  bootstrapOnly?: boolean;
  newUser: NewUserForm;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
  onDeactivateUser: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
  onNewUserChange: (field: keyof NewUserForm, value: string) => void;
  onProvisionTeacherAccounts: () => void;
  onResetUserPassword: (user: AppUser) => void;
  onUpdateUserRoles: (user: AppUser, roles: string[]) => void;
  userActionState: ActionState;
  userMessage: string;
  users: AppUser[];
};

export function UserManagementPanel({
  canAssignRootRole = false, bootstrapOnly = false, newUser, onCreateUser,
  onDeactivateUser, onDeleteUser, onNewUserChange, onProvisionTeacherAccounts, onResetUserPassword,
  onUpdateUserRoles, userActionState, userMessage, users,
}: UserManagementPanelProps) {
  const assignableRoleCards = roleCards.filter((role) => canAssignRootRole || role.role !== 'root');
  const roleOrder = useMemo(() => new Map(roleCards.map((role, index) => [role.role, index])), []);
  const creationRoleCards = bootstrapOnly
    ? roleCards.filter((role) => ['super admin', 'operator_sekolah'].includes(role.role))
    : assignableRoleCards;
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter((user) => !user.roles.includes('orang_tua'))
      .filter((user) => !normalizedQuery || [user.name, user.username, user.email, ...user.roles]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => {
        const aPriority = Math.min(...a.roles.map((role) => roleOrder.get(role) ?? Number.MAX_SAFE_INTEGER));
        const bPriority = Math.min(...b.roles.map((role) => roleOrder.get(role) ?? Number.MAX_SAFE_INTEGER));
        return aPriority - bPriority || a.name.localeCompare(b.name, 'id');
      });
  }, [query, roleOrder, users]);
  const totalPages = Math.max(Math.ceil(filteredUsers.length / DEFAULT_PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  return (
    <SurfaceCard className="sm:p-6">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">User Management</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Pengelolaan Akun</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          {bootstrapOnly
            ? 'Root menyiapkan akun Super Administrator dan Operator Sekolah sebagai pengelola awal. Root tetap memiliki kendali penuh untuk mengelola akun, role, reset password, menonaktifkan, atau menghapus akun.'
            : 'Kelola akun sekolah dan hak akses pengguna sesuai kewenangan.'}
        </p>
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100">Tambah user baru</summary>
        <form className="mt-4 grid gap-3" onSubmit={onCreateUser}>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={fieldClass} onChange={(event) => onNewUserChange('name', event.target.value)} placeholder="Nama lengkap" type="text" value={newUser.name} />
            <input className={fieldClass} onChange={(event) => onNewUserChange('username', event.target.value)} placeholder="Username" type="text" value={newUser.username} />
            <input className={fieldClass} onChange={(event) => onNewUserChange('email', event.target.value)} placeholder="Email (opsional)" type="email" value={newUser.email} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select className={`${fieldClass} sm:min-w-64`} onChange={(event) => onNewUserChange('role', event.target.value)} value={newUser.role}>
              {creationRoleCards.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
            </select>
            <Button disabled={userActionState === 'loading' || !newUser.username.trim() || !newUser.name.trim()} type="submit">
              {userActionState === 'loading' ? 'Membuat...' : 'Buat User'}
            </Button>
          </div>
        </form>
      </details>

      {userMessage ? <div className={['mt-4 rounded-2xl border p-4 text-sm font-semibold', userActionState === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100'].join(' ')}>{userMessage}</div> : null}

      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100">Keterangan dan tugas masing-masing role</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {roleCards.map((role) => <div className="min-w-0 border-t border-slate-200 pt-2 dark:border-slate-700" key={role.role}><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{role.label}</p><p className="mt-1 text-xs leading-5 text-muted">{role.description}</p></div>)}
        </div>
        <p className="mt-3 text-xs text-muted">Root memiliki kendali penuh. Super Administrator tidak dapat memberikan role Root.</p>
      </details>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-ink">Daftar Pengguna</h3>
            <p className="text-xs text-muted">{filteredUsers.length} akun ditampilkan</p>
          </div>
          <Button className="w-full sm:w-auto" disabled={userActionState === 'loading'} onClick={onProvisionTeacherAccounts} size="sm" variant="outline">
            {userActionState === 'loading' ? 'Memproses...' : 'Buat Akun Login Guru'}
          </Button>
        </div>
        <SearchInput
          className="sm:w-72"
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          onClear={() => { setQuery(''); setPage(1); }}
          placeholder="Cari nama, username, email, role..."
          value={query}
        />
      </div>

      <div className="mt-3 grid gap-2">
        {visibleUsers.map((user) => {
          const rolesForUser = selectedRoles[user.id] ?? user.roles;
          const rolesChanged = rolesForUser.length !== user.roles.length || !rolesForUser.every((role) => user.roles.includes(role));
          const availableRoles = assignableRoleCards.filter((role) => !rolesForUser.includes(role.role));
          const orderedRoles = [...user.roles].sort((a, b) => (roleOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (roleOrder.get(b) ?? Number.MAX_SAFE_INTEGER));

          return (
            <article className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-4" key={user.id}>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-slate-900 dark:text-slate-100">{user.name}</h3>
                <p className="mt-0.5 break-all text-xs text-muted">{user.username ?? '-'}{user.email ? ` · ${user.email}` : ''}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {orderedRoles.map((role) => <Badge key={role} tone="brand">{roleCards.find((item) => item.role === role)?.label ?? role}</Badge>)}
                </div>
              </div>

              <details className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700 sm:mt-0 sm:min-w-36 sm:border-0 sm:pt-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold text-brand-700 dark:text-brand-300 sm:justify-end">
                  Kelola akun <span aria-hidden="true" className="text-base">⌄</span>
                </summary>
                <div className="mt-3 grid gap-3 sm:w-[min(30rem,70vw)] sm:rounded-xl sm:border sm:border-slate-200 sm:bg-slate-50 sm:p-3 sm:dark:border-slate-700 sm:dark:bg-slate-950">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-muted" htmlFor={`add-role-${user.id}`}>Tambah role</label>
                    <select id={`add-role-${user.id}`} aria-label={`Tambah role untuk ${user.name}`} className={fieldClass} disabled={userActionState === 'loading' || !availableRoles.length} onChange={(event) => { const role = event.target.value; if (role) setSelectedRoles((current) => ({ ...current, [user.id]: [...rolesForUser, role] })); }} value="">
                      <option value="">Pilih role...</option>
                      {availableRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {rolesForUser.map((roleName) => {
                      const role = roleCards.find((item) => item.role === roleName);
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-100" key={roleName}>
                          {role?.label ?? roleName}
                          <button aria-label={`Hapus role ${role?.label ?? roleName}`} className="ml-1 rounded-full px-1 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20" disabled={userActionState === 'loading' || (!canAssignRootRole && roleName === 'root')} onClick={() => { if (window.confirm(`Hapus role ${role?.label ?? roleName} dari perubahan akun ${user.name}? Perubahan berlaku setelah tombol Simpan Role ditekan.`)) setSelectedRoles((current) => ({ ...current, [user.id]: rolesForUser.filter((item) => item !== roleName) })); }} type="button">×</button>
                        </span>
                      );
                    })}
                  </div>
                  <Button className="w-full sm:w-auto sm:justify-self-end" disabled={userActionState === 'loading' || !rolesForUser.length || !rolesChanged} onClick={() => onUpdateUserRoles(user, rolesForUser)} size="sm" variant="outline">Simpan Role</Button>
                  <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 dark:border-slate-700 sm:grid-cols-3">
                    <Button className="w-full" disabled={userActionState === 'loading'} onClick={() => void onResetUserPassword(user)} size="sm" variant="info">Reset Password</Button>
                    <Button className="w-full" disabled={userActionState === 'loading'} onClick={() => void onDeactivateUser(user)} size="sm" variant="outline">Nonaktifkan</Button>
                    <Button className="w-full" disabled={userActionState === 'loading'} onClick={() => void onDeleteUser(user)} size="sm" variant="danger">Hapus</Button>
                  </div>
                </div>
              </details>
            </article>
          );
        })}
        {!filteredUsers.length ? <EmptyState title="Tidak ada akun sesuai pencarian." /> : null}
      </div>
      <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} totalItems={filteredUsers.length} onPageChange={setPage} />
    </SurfaceCard>
  );
}
