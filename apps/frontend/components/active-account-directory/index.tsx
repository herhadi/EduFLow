'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { api, type AppUser } from '../../lib/api';
import { getRoleDisplayLabels } from '../dashboards/dashboard-types';
import { PrintPreview, type PrintPaperSize } from '../print/print-preview';
import { formatSchoolDate, formatSchoolDateTime, getSchoolDateKey } from '../../lib/school-time';
import { DEFAULT_PAGE_SIZE, Pagination } from '../ui/pagination';
import { roleCards } from '../admin-access-center/admin-access-center-utils';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { fieldClass } from '../ui/form';

type Audience = 'admin' | 'operator';
type LoadState = 'loading' | 'success' | 'error';
type AccountStatus = 'Aktif' | 'Terkunci';
type DirectoryProps = {
  audience: Audience;
  canManage?: boolean;
  canAssignRootRole?: boolean;
  refreshKey?: number;
  onUpdateUserRoles?: (user: AppUser, roles: string[]) => Promise<void>;
  onUpdateUsername?: (user: AppUser, username: string) => Promise<void>;
  onResetUserPassword?: (user: AppUser) => Promise<void>;
  onDeactivateUser?: (user: AppUser) => Promise<void>;
};

function formatDate(value?: string | null) {
  if (!value) return 'Belum pernah';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatSchoolDate(date, { dateStyle: 'medium' });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Belum pernah';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatSchoolDateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
}

function getAccountStatus(user: AppUser): AccountStatus {
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) return 'Terkunci';
  return 'Aktif';
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRoleLabels(roles: string[]) {
  return getRoleDisplayLabels(roles).join(', ') || 'Belum ada role';
}

export function ActiveAccountDirectory({
  audience, canManage = false, canAssignRootRole = false, refreshKey = 0,
  onUpdateUserRoles, onUpdateUsername, onResetUserPassword, onDeactivateUser,
}: DirectoryProps) {
  const [accounts, setAccounts] = useState<AppUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [showPreview, setShowPreview] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<AppUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleToAdd, setRoleToAdd] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');

  useEffect(() => {
    let ignore = false;
    api.getActiveAccounts()
      .then((response) => {
        if (ignore) return;
        setAccounts(response.data);
        setLoadState('success');
      })
      .catch(() => {
        if (!ignore) setLoadState('error');
      });
    return () => { ignore = true; };
  }, [refreshKey]);

  const directoryAccounts = useMemo(() => accounts.filter((account) => {
    const roles = account.roles.map((role) => role.trim().toLocaleLowerCase('id-ID'));
    const isDeveloperAccount = account.name.trim().toLocaleLowerCase('id-ID') === 'developer'
      || (account.username ?? '').trim().toLocaleLowerCase('id-ID') === 'developer'
      || roles.includes('developer');
    return !isDeveloperAccount && !roles.includes('root');
  }), [accounts]);

  const availableRoleNames = useMemo(() => {
    const roles = [...new Set(directoryAccounts.flatMap((account) => account.roles))];
    return roles.sort((a, b) => getRoleLabels([a]).localeCompare(getRoleLabels([b]), 'id'));
  }, [directoryAccounts]);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return directoryAccounts.filter((account) => {
      const matchesQuery = !normalizedQuery || [
        account.name,
        account.username ?? '',
        account.email,
        ...account.roles,
        getRoleLabels(account.roles),
      ].some((value) => value.toLocaleLowerCase('id-ID').includes(normalizedQuery));
      const matchesRole = roleFilter === 'all' || account.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'all' || getAccountStatus(account) === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [directoryAccounts, query, roleFilter, statusFilter]);

  const visibleAccounts = filteredAccounts.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);
  const assignableRoles = roleCards.filter((role) => canAssignRootRole || role.role !== 'root');
  const availableRoles = assignableRoles.filter((role) => !selectedRoles.includes(role.role));

  async function refreshAccounts() {
    const response = await api.getActiveAccounts();
    setAccounts(response.data);
  }

  const buildPages = (paperSize: PrintPaperSize): ReactNode[] => {
    // Reserve physical space for page margins, heading, table header, and footer.
    // Fixed 5.5 mm rows accommodate up to two compact text lines.
    const paperHeightMm = paperSize === 'F4' ? 330 : paperSize === 'A4' ? 297 : 210;
    const reservedHeightMm = 24 + 14 + 18 + 6;
    const rowHeightMm = 5.5;
    const rowsPerPage = Math.floor((paperHeightMm - reservedHeightMm) / rowHeightMm);
    const chunks: AppUser[][] = [];
    for (let index = 0; index < filteredAccounts.length; index += rowsPerPage) {
      chunks.push(filteredAccounts.slice(index, index + rowsPerPage));
    }
    return chunks.map((chunk, pageIndex) => (
      <div className="h-full" key={`${paperSize}-${pageIndex}`}>
        <div className="mb-3 border-b-2 border-slate-900 pb-2 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest">EduFlow · Administrasi Sekolah</p>
          <h2 className="mt-1 text-base font-black">Daftar Akun Aktif</h2>
          <p className="mt-1 text-[9px]">Jumlah: {filteredAccounts.length} akun · Lembar {pageIndex + 1}/{chunks.length}</p>
        </div>
        <table className="active-account-print-table w-full table-fixed border-collapse text-[7px] leading-none">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-[4%] border border-slate-400 px-1 py-1 text-center">No</th>
              <th className="w-[15%] border border-slate-400 px-1 py-1 text-left">Nama</th>
              <th className="w-[12%] border border-slate-400 px-1 py-1 text-left">Username</th>
              <th className="w-[18%] border border-slate-400 px-1 py-1 text-left">Email</th>
              <th className="w-[16%] border border-slate-400 px-1 py-1 text-left">Role</th>
              <th className="w-[15%] border border-slate-400 px-1 py-1 text-left">Login terakhir</th>
              <th className="w-[8%] border border-slate-400 px-1 py-1 text-center">Status</th>
              <th className="w-[12%] border border-slate-400 px-1 py-1 text-left">Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {chunk.map((account, index) => (
              <tr className="active-account-print-row" key={account.id}>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0 text-center"><div>{pageIndex * rowsPerPage + index + 1}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0 font-semibold"><div>{account.name}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0"><div>{account.username || '—'}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0"><div>{account.email}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0"><div>{getRoleLabels(account.roles)}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0"><div>{formatDateTime(account.lastLoginAt)}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0 text-center"><div>{getAccountStatus(account)}</div></td>
                <td className="active-account-print-cell border border-slate-300 px-1 py-0"><div>{formatDate(account.createdAt)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ));
  };

  function downloadExcel() {
    const header = ['No', 'Nama', 'Username', 'Email', 'Role', 'Login Terakhir', 'Status', 'Tanggal Dibuat'];
    const rows = filteredAccounts.map((account, index) => [
      index + 1,
      account.name,
      account.username || '',
      account.email,
      getRoleLabels(account.roles),
      formatDateTime(account.lastLoginAt),
      getAccountStatus(account),
      formatDate(account.createdAt),
    ]);
    const table = [header, ...rows].map((row, rowIndex) => '<tr>' + row.map((value) =>
      '<td' + (rowIndex === 0 ? ' style="font-weight:bold;background:#e2e8f0"' : '') + '>' + escapeHtml(value) + '</td>',
    ).join('') + '</tr>').join('');
    const workbook = '<html><head><meta charset="utf-8"></head><body><table border="1"><tbody>' + table + '</tbody></table></body></html>';
    const blob = new Blob(['\uFEFF' + workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'daftar-akun-aktif-' + getSchoolDateKey() + '.xls';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const roleLabel = audience === 'admin' ? 'Super Administrator' : 'Operator Sekolah';

  return (
    <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-[var(--text)]">Daftar Akun Aktif</h2>
          <p className="mt-1 text-xs text-muted">Akun pengguna, identitas, role, dan status akses</p>
        </div>
        <button
          className="min-h-11 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={loadState !== 'success' || filteredAccounts.length === 0}
          onClick={() => setShowPreview(true)}
          type="button"
        >Preview & Cetak</button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-[var(--surface-soft)]">
        <span><strong className="text-ink">{filteredAccounts.length}</strong> akun ditampilkan</span>
        <span className="text-muted"><strong className="text-ink">{directoryAccounts.filter((account) => getAccountStatus(account) === 'Terkunci').length}</strong> akun terkunci</span>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_160px]">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Cari nama, username, email, atau role…"
          value={query}
        />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]" onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} value={roleFilter}>
          <option value="all">Semua role</option>
          {availableRoleNames.map((role) => <option key={role} value={role}>{getRoleLabels([role])}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]" onChange={(event) => { setStatusFilter(event.target.value as 'all' | AccountStatus); setPage(1); }} value={statusFilter}>
          <option value="all">Semua status</option>
          <option value="Aktif">Aktif</option>
          <option value="Terkunci">Terkunci</option>
        </select>
      </div>

      {loadState === 'loading' ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-muted dark:bg-[var(--surface-soft)]">Memuat daftar akun…</p> : null}
      {loadState === 'error' ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Daftar akun gagal dimuat. Periksa koneksi atau hak akses Anda.</p> : null}
      {loadState === 'success' && filteredAccounts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted">Tidak ada akun yang cocok dengan filter.</p> : null}

      {loadState === 'success' && filteredAccounts.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[var(--border)]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-[var(--surface-soft)] dark:text-muted">
              <tr>
                <th className="px-3 py-3 text-center">No</th>
                <th className="px-3 py-3 text-left">Nama</th>
                <th className="px-3 py-3 text-left">Username</th>
                <th className="px-3 py-3 text-left">Email</th>
                <th className="px-3 py-3 text-left">Role</th>
                <th className="px-3 py-3 text-left">Login terakhir</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Dibuat</th>
                {canManage ? <th className="sticky right-0 z-10 bg-slate-50 px-3 py-3 text-center shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.5)] dark:bg-[var(--surface-soft)]">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((account, index) => {
                const status = getAccountStatus(account);
                return (
                  <tr className="border-t border-slate-100 text-slate-700 dark:border-[var(--border)] dark:text-[var(--text)] [&>td]:py-3 dark:[&>td]:border-slate-800" key={account.id}>
                    <td className="px-3 py-3 text-center text-xs text-muted">{(page - 1) * DEFAULT_PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3 font-semibold">{account.name}</td>
                    <td className="px-3 py-3">{account.username || '—'}</td>
                    <td className="px-3 py-3">{account.email}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {account.roles.length ? account.roles.map((roleName) => (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-500/10 dark:text-brand-200" key={roleName}>
                            {roleCards.find((role) => role.role === roleName)?.label ?? getRoleLabels([roleName])}
                          </span>
                        )) : <span className="text-xs text-muted">Belum ada role</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{formatDateTime(account.lastLoginAt)}</td>
                    <td className="px-3 py-3"><span className={status === 'Terkunci' ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800' : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800'}>{status}</span></td>
                    <td className="px-3 py-3">{formatDate(account.createdAt)}</td>
                    {canManage ? (
                      <td className="sticky right-0 z-[1] bg-white px-2 py-2 text-center shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.5)] dark:bg-[var(--surface-solid)]">
                        <Button aria-label={`Edit akun ${account.name}`} className="gap-1.5 whitespace-nowrap" onClick={() => { setSelectedAccount(account); setSelectedRoles(account.roles); setRoleToAdd(''); setUsernameDraft(account.username ?? ''); }} size="sm" variant="info">
                          <Pencil aria-hidden="true" size={14} strokeWidth={2.5} />
                          <span>Kelola</span>
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {loadState === 'success' ? (
        <Pagination
          onPageChange={setPage}
          page={page}
          pageSize={DEFAULT_PAGE_SIZE}
          totalItems={filteredAccounts.length}
        />
      ) : null}

      <p className="mt-2 text-xs text-muted">Menampilkan akun yang belum dinonaktifkan. Akun terkunci tetap ditampilkan dengan status Terkunci.</p>

      {canManage && selectedAccount ? (
        <Dialog
          className="max-w-lg"
          description="Perbarui role atau lakukan tindakan pada akun ini."
          onClose={() => setSelectedAccount(null)}
          open
          title="Kelola Akun"
        >
          <div className="grid gap-5">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-[var(--surface-soft)]">
              <p className="text-sm font-bold text-ink">{selectedAccount.name}</p>
              <p className="mt-0.5 break-all text-xs text-muted">@{selectedAccount.username || selectedAccount.email}</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted" htmlFor="account-username">Username login</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="account-username" autoComplete="off" className={fieldClass} maxLength={50} minLength={3} onChange={(event) => setUsernameDraft(event.target.value)} value={usernameDraft} />
                <Button className="min-h-11 shrink-0" disabled={!usernameDraft.trim() || usernameDraft.trim().toLowerCase() === (selectedAccount.username ?? '').toLowerCase()} onClick={async () => { await onUpdateUsername?.(selectedAccount, usernameDraft.trim()); await refreshAccounts(); setSelectedAccount(null); }} size="md" variant="success">Simpan Username</Button>
              </div>
              <p className="text-xs text-muted">3-50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung. Username langsung berlaku untuk login.</p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-bold text-muted">Role akun</p>
              <div className="flex min-h-12 flex-wrap content-start gap-2 rounded-xl border border-slate-200 p-3 dark:border-[var(--border)]">
                {selectedRoles.map((roleName) => {
                  const role = roleCards.find((item) => item.role === roleName);
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-100" key={roleName}>
                      {role?.label ?? roleName}
                      <button aria-label={`Hapus role ${role?.label ?? roleName}`} className="ml-1 rounded-full px-1 text-rose-700 hover:bg-rose-100 dark:text-rose-300" disabled={!canAssignRootRole && roleName === 'root'} onClick={() => setSelectedRoles((current) => current.filter((item) => item !== roleName))} type="button">×</button>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select className={`${fieldClass} min-h-11 min-w-0`} onChange={(event) => setRoleToAdd(event.target.value)} value={roleToAdd}>
                <option value="">Pilih role untuk ditambahkan...</option>
                {availableRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
              </select>
              <Button className="min-h-11 w-full px-4 sm:w-auto" disabled={!roleToAdd} onClick={() => { setSelectedRoles((current) => [...current, roleToAdd]); setRoleToAdd(''); }} size="md" variant="outline">+ Tambah Role</Button>
            </div>
            <Button className="min-h-11 w-full px-4" disabled={!selectedRoles.length || (selectedRoles.length === selectedAccount.roles.length && selectedRoles.every((role) => selectedAccount.roles.includes(role)))} onClick={async () => { await onUpdateUserRoles?.(selectedAccount, selectedRoles); await refreshAccounts(); setSelectedAccount(null); }} size="md" variant="success">Simpan Perubahan Role</Button>
            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 dark:border-[var(--border)] sm:grid-cols-2">
              <Button className="min-h-11 w-full px-4" onClick={async () => { await onResetUserPassword?.(selectedAccount); await refreshAccounts(); setSelectedAccount(null); }} size="md" variant="info">Reset Password</Button>
              <Button className="min-h-11 w-full px-4" onClick={async () => { await onDeactivateUser?.(selectedAccount); await refreshAccounts(); setSelectedAccount(null); }} size="md" variant="danger">Nonaktifkan</Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      <style jsx global>{`
        .active-account-print-table { border-collapse: collapse; table-layout: fixed; }
        .active-account-print-row { height: 5.5mm; }
        .active-account-print-cell { height: 5.5mm; max-height: 5.5mm; padding-top: 0.5mm !important; padding-bottom: 0.5mm !important; vertical-align: middle; overflow: hidden; line-height: 1.05 !important; overflow-wrap: anywhere; }
        .active-account-print-cell > div { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-height: 2.1em; line-height: 1.05; }
      `}</style>

      {showPreview ? (
        <PrintPreview
          footerText={`Daftar akun aktif · ${roleLabel}`}
          onClose={() => setShowPreview(false)}
          onDownloadExcel={downloadExcel}
          pages={buildPages('F4')}
          pagesForPaperSize={buildPages}
          paperId={`active-account-directory-${audience}`}
          paperSize="F4"
          title="Daftar Akun Aktif"
        />
      ) : null}
    </section>
  );
}
