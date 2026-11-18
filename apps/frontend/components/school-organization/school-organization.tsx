'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Users } from 'lucide-react';
import { request } from '../../lib/api-client';
import { getCurrentSessionUser } from '../../lib/session';

type Teacher = { id: string; name: string; nip?: string | null };
type Position = { id: string; title: string; personName?: string | null; teacherId?: string | null; category: string; sortOrder: number; locked?: boolean };
type OrganizationResponse = { positions: Position[]; defaults: Position[] };

const categoryOptions = ['Pimpinan', 'Wakil Kepala Sekolah', 'Tenaga Kependidikan', 'Koordinator', 'Jabatan Lainnya'];

export function SchoolOrganization() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { setRoles(getCurrentSessionUser()?.roles ?? []); }, []);
  const canManage = roles.includes('operator_sekolah') && !roles.includes('root') && !roles.some((role) => role.trim().toLowerCase() === 'super admin');
  const [positions, setPositions] = useState<Position[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<OrganizationResponse>('/school-organization');
      setPositions(data.positions);
      if (canManage) setTeachers(await request<Teacher[]>('/school-organization/teachers'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat struktur organisasi.'); }
    finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => positions.filter((item) => item.title.trim()).sort((a, b) => a.sortOrder - b.sortOrder).reduce<Record<string, Position[]>>((result, item) => {
    (result[item.category] ??= []).push(item); return result;
  }, {}), [positions]);

  function update(index: number, patch: Partial<Position>) {
    setPositions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const result = await request<OrganizationResponse>('/school-organization', { method: 'PUT', body: JSON.stringify({ positions }) });
      setPositions(result.positions); setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan struktur organisasi.'); }
    finally { setSaving(false); }
  }

  function addPosition() {
    setPositions((items) => [...items, { id: `custom-${Date.now()}`, title: '', personName: '', teacherId: null, category: 'Jabatan Lainnya', sortOrder: items.length }]);
  }

  if (loading) return <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Memuat bagan organisasi...</div>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Users size={20} /></div><div><h2 className="font-semibold">Struktur Organisasi Sekolah</h2><p className="text-xs text-muted-foreground">{canManage ? 'Dikelola oleh Operator Sekolah' : 'Informasi struktur organisasi sekolah'}</p></div></div>
        {canManage && !editing && <button onClick={() => setEditing(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Kelola Struktur</button>}
        {canManage && editing && <div className="flex gap-2"><button onClick={() => { setEditing(false); void load(); }} className="rounded-xl border px-3 py-2 text-sm">Batal</button><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Save size={16}/>{saving ? 'Menyimpan...' : 'Simpan'}</button></div>}
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {editing ? <div className="space-y-3">
        {positions.map((item, index) => <div key={item.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2">
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Nama Jabatan</span><input value={item.title} disabled={item.locked} onChange={(e) => update(index, { title: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-60" /></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Kelompok</span><select value={item.category} disabled={item.locked} onChange={(e) => update(index, { category: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-60">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Guru/Pegawai</span><select value={item.teacherId ?? ''} disabled={item.locked} onChange={(e) => update(index, { teacherId: e.target.value || null, personName: '' })} className="w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-60"><option value="">Belum ditentukan</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.nip ? ` · ${teacher.nip}` : ''}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Nama di luar daftar guru (opsional)</span><input value={item.personName ?? ''} disabled={item.locked || Boolean(item.teacherId)} onChange={(e) => update(index, { personName: e.target.value })} placeholder="Misalnya pegawai tata usaha" className="w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-60" /></label>
          {!item.locked && <div className="md:col-span-2 flex justify-end"><button onClick={() => setPositions((items) => items.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 size={15}/> Hapus jabatan</button></div>}
        </div>)}
        <button onClick={addPosition} className="inline-flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium"><Plus size={16}/> Tambah Jabatan</button>
        <p className="text-xs text-muted-foreground">Maksimal tiga jabatan dalam kelompok Wakil Kepala Sekolah. Penetapan jabatan tidak mengubah role akun EduFlow.</p>
      </div> : <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => <div key={category} className="space-y-3"><h3 className="text-sm font-semibold text-muted-foreground">{category}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
          const teacher = teachers.find((person) => person.id === item.teacherId);
          return <div key={item.id} className={`rounded-2xl border bg-card p-4 text-center ${item.category === 'Pimpinan' ? 'sm:col-span-2 lg:col-span-3' : ''}`}><div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Users size={20}/></div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{teacher?.name ?? item.personName ?? 'Belum ditentukan'}</p></div>;
        })}</div></div>)}
        {!positions.length && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Bagan struktur organisasi belum diisi.</div>}
      </div>}
    </section>
  );
}
