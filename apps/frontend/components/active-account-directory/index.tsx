'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { api, type AppUser } from '../../lib/api';
import { getRoleDisplayLabels } from '../dashboards/dashboard-types';
import { PrintPreview, type PrintPaperSize } from '../print/print-preview';
import { formatSchoolDate, formatSchoolDateTime, getSchoolDateKey } from '../../lib/school-time';
import { DEFAULT_PAGE_SIZE, Pagination } from '../ui/pagination';

type Audience = 'admin' | 'operator';
type LoadState = 'loading' | 'success' | 'error';
type AccountStatus = 'Aktif' | 'Terkunci';

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

export function ActiveAccountDirectory({ audience }: { audience: Audience }) {
  const [accounts, setAccounts] = useState<AppUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [showPreview, setShowPreview] = useState(false);
  const [page, setPage] = useState(1);

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
  }, []);

  const availableRoles = useMemo(() => {
    const roles = [...new Set(accounts.flatMap((account) => account.roles))];
    return roles.sort((a, b) => getRoleLabels([a]).localeCompare(getRoleLabels([b]), 'id'));
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return accounts.filter((account) => {
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
  }, [accounts, query, roleFilter, statusFilter]);

  const visibleAccounts = filteredAccounts.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

  const buildPages = (paperSize: PrintPaperSize): ReactNode[] => {
    const rowsPerPage = paperSize === 'A4_LANDSCAPE' ? 26 : paperSize === 'A4' ? 38 : 45;
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
        <table className="w-full table-fixed border-collapse text-[7px] leading-tight">
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
              <tr key={account.id}>
                <td className="border border-slate-300 px-1 py-1 text-center">{pageIndex * rowsPerPage + index + 1}</td>
                <td className="break-words border border-slate-300 px-1 py-1 font-semibold">{account.name}</td>
                <td className="break-words border border-slate-300 px-1 py-1">{account.username || '—'}</td>
                <td className="break-words border border-slate-300 px-1 py-1">{account.email}</td>
                <td className="break-words border border-slate-300 px-1 py-1">{getRoleLabels(account.roles)}</td>
                <td className="border border-slate-300 px-1 py-1">{formatDateTime(account.lastLoginAt)}</td>
                <td className="border border-slate-300 px-1 py-1 text-center">{getAccountStatus(account)}</td>
                <td className="border border-slate-300 px-1 py-1">{formatDate(account.createdAt)}</td>
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
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-[var(--text)]">Daftar Akun Aktif</h2>
          <p className="mt-1 text-xs text-muted">Seluruh akun yang belum dinonaktifkan · Hanya lihat dan cetak</p>
        </div>
        <button
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={loadState !== 'success' || filteredAccounts.length === 0}
          onClick={() => setShowPreview(true)}
          type="button"
        >Preview & Cetak</button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-950/30">
          <p className="text-xs font-semibold text-muted">Total akun ditampilkan</p>
          <p className="mt-1 text-2xl font-black text-brand-700 dark:text-brand-300">{filteredAccounts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
          <p className="text-xs font-semibold text-muted">Akun terkunci</p>
          <p className="mt-1 text-2xl font-black text-slate-800 dark:text-[var(--text)]">{filteredAccounts.filter((account) => getAccountStatus(account) === 'Terkunci').length}</p>
        </div>
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
          {availableRoles.map((role) => <option key={role} value={role}>{getRoleLabels([role])}</option>)}
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
          <table className="w-full min-w-[950px] text-sm">
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
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((account, index) => {
                const status = getAccountStatus(account);
                return (
                  <tr className="border-t border-slate-100 text-slate-700 dark:border-[var(--border)] dark:text-[var(--text)]" key={account.id}>
                    <td className="px-3 py-3 text-center text-xs text-muted">{(page - 1) * DEFAULT_PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3 font-semibold">{account.name}</td>
                    <td className="px-3 py-3">{account.username || '—'}</td>
                    <td className="px-3 py-3">{account.email}</td>
                    <td className="px-3 py-3">{getRoleLabels(account.roles)}</td>
                    <td className="px-3 py-3">{formatDateTime(account.lastLoginAt)}</td>
                    <td className="px-3 py-3"><span className={status === 'Terkunci' ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800' : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800'}>{status}</span></td>
                    <td className="px-3 py-3">{formatDate(account.createdAt)}</td>
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

      <p className="mt-3 text-xs text-muted">Menampilkan akun yang belum dinonaktifkan. Akun yang sedang terkunci tetap ditampilkan dengan status Terkunci.</p>

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
