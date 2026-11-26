'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './ui/toast';
type Matrix = Awaited<ReturnType<typeof api.getRolePermissionMatrix>>['data'];
function displayRole(name: string) { return name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
const ROLE_ORDER = ['root', 'kepala_sekolah', 'super_admin', 'operator_sekolah', 'tu', 'guru', 'wali_kelas', 'bk', 'orang_tua'];

export function RolePermissionMatrix() {
  const toast = useToast();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const response = await api.getRolePermissionMatrix(); setMatrix(response.data); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat matriks hak akses.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const roleColumns = useMemo(() => [...(matrix?.roles ?? [])].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.name); const bi = ROLE_ORDER.indexOf(b.name);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name);
  }), [matrix]);
  async function update(roleId: string, moduleKey: string, view: boolean, write: boolean) {
    if (!matrix) return;
    const role = matrix.roles.find((item) => item.id === roleId);
    const module = matrix.modules.find((item) => item.key === moduleKey);
    if (!role || !module) return;
    const key = roleId + ':' + moduleKey;
    const previous = [...role.permissions];
    const enabled = new Set(previous);
    for (const permission of [...module.view, ...module.write]) enabled.delete(permission);
    if (view) module.view.forEach((permission) => enabled.add(permission));
    if (write) module.write.forEach((permission) => enabled.add(permission));
    setMatrix({ ...matrix, roles: matrix.roles.map((item) => item.id === roleId ? { ...item, permissions: [...enabled] } : item) });
    setSavingKey(key);
    try { await api.updateRolePermissionMatrix({ roleId, moduleKey, view, write }); toast.success('Hak akses berhasil disimpan.', 'Hak Akses'); }
    catch (caught) {
      setMatrix((current) => current ? { ...current, roles: current.roles.map((item) => item.id === roleId ? { ...item, permissions: previous } : item) } : current);
      toast.error(caught instanceof Error ? caught.message : 'Gagal menyimpan hak akses.', 'Gagal');
    } finally { setSavingKey(''); }
  }
  if (loading) return <div className="rounded-2xl border border-[var(--border)] p-5 text-sm text-muted">Memuat matriks hak akses...</div>;
  if (error) return <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error} <button className="ml-2 underline" onClick={() => void load()}>Coba lagi</button></div>;
  if (!matrix) return null;
  return <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm dark:bg-[var(--surface)] sm:p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-[var(--foreground)]">Matriks Hak Akses Role</h2><p className="mt-1 text-sm text-muted">Baris adalah modul EduFlow. Setiap role memiliki pilihan View dan Write.</p></div>
      <div className="flex gap-4 text-xs text-muted"><span><b className="text-[var(--foreground)]">View</b> · melihat data</span><span><b className="text-[var(--foreground)]">Write</b> · mengubah data</span></div>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/60"><tr>
          <th rowSpan={2} className="sticky left-0 z-20 min-w-52 border-b border-r border-[var(--border)] bg-slate-50 px-3 py-3 text-left font-semibold dark:bg-slate-900">Modul</th>
          {roleColumns.map((role) => <th key={role.id} colSpan={2} className="min-w-32 border-b border-r border-[var(--border)] px-2 py-3 text-center font-semibold">{displayRole(role.name)}</th>)}
        </tr><tr>{roleColumns.map((role) => <th key={role.id + '-labels'} colSpan={2} className="border-b border-r border-[var(--border)] px-1 py-1"><div className="flex justify-around text-[11px] font-medium text-muted"><span>View</span><span>Write</span></div></th>)}</tr></thead>
        <tbody>{matrix.modules.map((module, index) => {
          const zebraClass = index % 2 === 0 ? 'bg-white dark:bg-slate-900/70' : 'bg-slate-100 dark:bg-slate-800/90';
          const stickyZebraClass = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800';
          return <tr key={module.key} className={`group border-b border-slate-300 dark:border-slate-600 last:border-b-0 ${zebraClass} hover:!bg-blue-100 dark:hover:!bg-slate-700`}>
          <th className={`sticky left-0 z-10 border-r border-slate-300 dark:border-slate-600 px-3 py-2.5 text-left font-medium ${stickyZebraClass} group-hover:!bg-blue-100 dark:group-hover:!bg-slate-700`}>{module.label}</th>
          {roleColumns.map((role) => {
            const hasView = module.view.some((permission) => role.permissions.includes(permission));
            const hasWrite = module.write.some((permission) => role.permissions.includes(permission));
            const isSaving = savingKey === role.id + ':' + module.key;
            const isRootRole = role.name === 'root';
            return <td key={role.id} colSpan={2} className="border-r border-[var(--border)] px-1 py-2"><div className="flex items-center justify-around gap-3">
              <input aria-label={module.label + ' View ' + displayRole(role.name)} type="checkbox" checked={hasView} disabled={isRootRole || module.view.length === 0 || isSaving} onChange={(event) => void update(role.id, module.key, event.target.checked, event.target.checked ? hasWrite : false)} className="h-4 w-4 accent-blue-600 disabled:opacity-30" />
              <input aria-label={module.label + ' Write ' + displayRole(role.name)} type="checkbox" checked={hasWrite} disabled={isRootRole || isSaving || module.write.length === 0} onChange={(event) => void update(role.id, module.key, module.view.length ? (hasView || event.target.checked) : hasView, event.target.checked)} className="h-4 w-4 accent-blue-600 disabled:opacity-30" />
            </div></td>;
          })}
        </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">Pada modul yang memiliki View, mengaktifkan Write juga mengaktifkan View. Mematikan View turut mematikan Write. Akses Root ditampilkan sebagai acuan dan tidak dapat diubah. Perubahan permission berlaku setelah token akses pengguna diperbarui (maksimal sekitar 15 menit).</p>
  </section>;
}
