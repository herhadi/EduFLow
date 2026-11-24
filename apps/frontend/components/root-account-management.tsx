'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, type AppUser } from '../lib/api';
import { Button } from './ui/button';
import { useToast } from './ui/toast';

export function RootAccountManagement() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<AppUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await api.getSystemAccounts();
      setAccounts(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat akun sistem.', 'Akses Gagal');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('id-ID');
    return accounts.filter((user) => [user.name, user.username ?? '', user.email, ...user.roles].join(' ').toLocaleLowerCase('id-ID').includes(term));
  }, [accounts, query]);

  async function changeUsername(user: AppUser) {
    const current = user.username ?? '';
    const next = window.prompt(`Ubah username untuk ${user.name}:`, current);
    if (next === null || !next.trim() || next.trim().toLowerCase() === current.toLowerCase()) return;
    setBusyId(user.id);
    try {
      const result = await api.updateUserUsername(user.id, next.trim());
      toast.success(result.message ?? 'Username berhasil diperbarui.', 'Username Diperbarui');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah username.', 'Aksi Gagal');
    } finally {
      setBusyId(null);
    }
  }

  async function permanentlyDelete(user: AppUser) {
    const identity = user.username || user.email;
    if (!window.confirm(`HAPUS PERMANEN akun ${user.name} (${identity})? Penghapusan tidak dapat dibatalkan.`)) return;
    if (window.prompt(`Ketik HAPUS untuk menghapus akun ${identity}.`) !== 'HAPUS') return;
    setBusyId(user.id);
    try {
      const result = await api.deleteUser(user.id);
      toast.success(result.message ?? 'Akun berhasil dihapus permanen.', 'Akun Dihapus');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Akun gagal dihapus permanen.', 'Penghapusan Ditolak');
    } finally {
      setBusyId(null);
    }
  }

  return <section className="mt-5 space-y-4">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">Khusus Root. Penghapusan permanen tidak dapat dibatalkan. Jika histori operasional masih mereferensikan akun, proses akan ditolak agar data historis tetap utuh.</div>
    <input aria-label="Cari akun" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]" onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, username, email, atau role..." value={query} />
    {loading ? <p className="text-sm text-muted">Memuat akun sistem...</p> : <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm dark:border-[var(--border)]"><strong>{filtered.length} akun</strong><Button onClick={() => void load()} size="sm" variant="outline">Muat Ulang</Button></div>
      <div className="divide-y divide-slate-200 dark:divide-[var(--border)]">{filtered.map((user) => <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={user.id}>
        <div className="min-w-0"><p className="font-semibold text-slate-900 dark:text-[var(--text)]">{user.name}</p><p className="break-all text-xs text-muted">{user.username || user.email} · {user.roles.join(', ') || 'Tanpa role'}</p><p className="mt-1 text-xs">{user.deletedAt ? <span className="font-semibold text-amber-700 dark:text-amber-300">Nonaktif / soft deleted</span> : <span className="font-semibold text-emerald-700 dark:text-emerald-300">Aktif</span>}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Button className="w-full sm:w-auto" disabled={busyId === user.id || !!user.deletedAt} onClick={() => void changeUsername(user)} size="md" variant="outline">Ubah Username</Button><Button className="w-full sm:w-auto" disabled={busyId === user.id} onClick={() => void permanentlyDelete(user)} size="md" variant="danger">{busyId === user.id ? 'Memproses...' : 'Hapus Permanen'}</Button></div>
      </div>)}</div>
    </div>}
  </section>;
}
