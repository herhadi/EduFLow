'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ImagePlus, Plus, Save, Trash2, Users, X } from 'lucide-react';
import { request, upload } from '../../lib/api-client';
import { getCurrentSessionUser } from '../../lib/session';
import { prepareProfilePhotoForUpload } from '../../lib/image-compression';

type Teacher = { id: string; name: string; nip?: string | null; photoUrl?: string | null };
type Position = { id: string; title: string; personName?: string | null; teacherId?: string | null; parentId?: string | null; category: string; sortOrder: number; locked?: boolean; nip?: string | null; photoUrl?: string | null };
type OrganizationResponse = { positions: Position[]; defaults: Position[] };
type UploadResponse = { data?: Teacher; message?: string };

const categoryOptions = ['Pimpinan', 'Wakil Kepala Sekolah', 'Tenaga Kependidikan', 'Koordinator', 'Jabatan Lainnya'];

export function SchoolOrganization() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { setRoles(getCurrentSessionUser()?.roles ?? []); }, []);
  const canManage = roles.includes('operator_sekolah') && !roles.includes('root');
  const [positions, setPositions] = useState<Position[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const childrenByParent = useMemo(() => {
    const result = new Map<string | null, Position[]>();
    for (const item of [...positions].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const parentId = item.parentId ?? null;
      result.set(parentId, [...(result.get(parentId) ?? []), item]);
    }
    return result;
  }, [positions]);

  function update(id: string, patch: Partial<Position>) {
    setPositions((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await request<OrganizationResponse>('/school-organization', { method: 'PUT', body: JSON.stringify({ positions }) });
      setPositions(result.positions); setEditing(false); setNotice('Struktur organisasi berhasil disimpan.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan struktur organisasi.'); }
    finally { setSaving(false); }
  }

  function addPosition() {
    const id = `custom-${Date.now()}`;
    setPositions((items) => [...items, { id, title: '', personName: '', teacherId: null, parentId: 'principal', category: 'Jabatan Lainnya', sortOrder: items.length }]);
  }

  async function changePhoto(position: Position, file?: File) {
    if (!position.teacherId || !file) return;
    setUploadingId(position.id); setError(''); setNotice('');
    try {
      const prepared = await prepareProfilePhotoForUpload(file);
      const response = await upload<UploadResponse>(`/school-organization/teachers/${position.teacherId}/photo`, prepared);
      const teacher = response.data;
      if (teacher) {
        setTeachers((items) => items.map((item) => item.id === teacher.id ? { ...item, ...teacher } : item));
        setPositions((items) => items.map((item) => item.teacherId === teacher.id ? { ...item, photoUrl: teacher.photoUrl ?? null } : item));
      }
      setNotice('Foto bagan dan foto profil akun berhasil diperbarui.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memperbarui foto.'); }
    finally { setUploadingId(null); }
  }

  const renderNode = (item: Position, depth = 0): ReactNode => {
    const teacher = teachers.find((person) => person.id === item.teacherId);
    const name = teacher?.name ?? item.personName ?? 'Belum ditentukan';
    const nip = teacher?.nip ?? item.nip;
    const photoUrl = teacher?.photoUrl ?? item.photoUrl;
    const children = childrenByParent.get(item.id) ?? [];
    return (
      <div className="relative flex w-full min-w-0 flex-col items-center" key={item.id}>
        <article className={`relative z-10 w-full max-w-[340px] overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${item.id === 'principal' ? 'border-blue-300 ring-2 ring-blue-100 dark:border-blue-700 dark:ring-blue-950' : 'border-border'}`}>
          <div className={`h-1.5 w-full ${item.id === 'principal' ? 'bg-blue-600' : item.category === 'Wakil Kepala Sekolah' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
          <div className="flex items-center gap-3 p-4">
            <div className="relative size-[76px] shrink-0 overflow-hidden rounded-xl border bg-muted">
              {photoUrl ? <img src={photoUrl} alt={`Foto ${name}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-2xl font-bold text-muted-foreground">{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—'}</div>}
              {editing && canManage && item.teacherId && <button type="button" title="Ganti foto dan perbarui foto profil" onClick={() => fileInputRefs.current[item.id]?.click()} disabled={uploadingId === item.id} className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-950/80 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-950 disabled:opacity-60"><ImagePlus size={12}/>{uploadingId === item.id ? 'Mengunggah' : 'Ganti foto'}</button>}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{item.title || 'Jabatan belum diisi'}</p>
              <p className="mt-1 break-words text-sm font-bold text-foreground">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">NIP: {nip || '—'}</p>
            </div>
          </div>
          {editing && canManage && item.teacherId && <input ref={(node) => { fileInputRefs.current[item.id] = node; }} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void changePhoto(item, event.target.files?.[0]); event.currentTarget.value = ''; }} />}
          {editing && canManage && <div className="space-y-3 border-t bg-muted/20 p-3 text-left">
            <label className="block space-y-1 text-xs font-semibold"><span>Nama Jabatan</span><input value={item.title} disabled={item.locked} onChange={(event) => update(item.id, { title: event.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-60" /></label>
            <label className="block space-y-1 text-xs font-semibold"><span>Kelompok Jabatan</span><select value={item.category} disabled={item.locked} onChange={(event) => update(item.id, { category: event.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-60">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="block space-y-1 text-xs font-semibold"><span>Guru/Pegawai</span><select value={item.teacherId ?? ''} disabled={item.locked} onChange={(event) => { const selected = teachers.find((person) => person.id === event.target.value); update(item.id, { teacherId: selected?.id ?? null, personName: selected?.name ?? '', nip: selected?.nip ?? null, photoUrl: selected?.photoUrl ?? null }); }} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-60"><option value="">Belum ditentukan / isi nama manual</option>{teachers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.nip ? ` · ${person.nip}` : ''}</option>)}</select></label>
            {!item.teacherId && !item.locked && <><label className="block space-y-1 text-xs font-semibold"><span>Nama pegawai di luar daftar guru</span><input value={item.personName ?? ''} onChange={(event) => update(item.id, { personName: event.target.value })} placeholder="Nama lengkap pegawai" className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal" /></label><label className="block space-y-1 text-xs font-semibold"><span>NIP (opsional)</span><input value={item.nip ?? ''} onChange={(event) => update(item.id, { nip: event.target.value })} placeholder="Masukkan NIP" className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal" /></label></>}
            <label className="block space-y-1 text-xs font-semibold"><span>Atasan langsung</span><select value={item.parentId ?? ''} disabled={item.locked} onChange={(event) => update(item.id, { parentId: event.target.value || null })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-60"><option value="">Pilih atasan langsung</option>{positions.filter((candidate) => candidate.id !== item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title || 'Jabatan belum diisi'}</option>)}</select></label>
            {!item.locked && <button type="button" onClick={() => setPositions((items) => items.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.parentId === item.id ? { ...candidate, parentId: item.parentId ?? null } : candidate))} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 size={14}/> Hapus jabatan</button>}
          </div>}
        </article>
        {children.length > 0 && <div className="relative mt-8 w-full pt-7 before:absolute before:left-1/2 before:top-0 before:h-7 before:border-l-2 before:border-sky-300 dark:before:border-sky-800 after:absolute after:left-[8%] after:right-[8%] after:top-0 after:border-t-2 after:border-sky-300 dark:after:border-sky-800">
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">{children.map((child) => <div className="relative flex min-w-0 justify-center before:absolute before:-top-7 before:left-1/2 before:h-7 before:border-l-2 before:border-sky-300 dark:before:border-sky-800" key={child.id}>{renderNode(child, depth + 1)}</div>)}</div>
        </div>}
      </div>
    );
  };

  if (loading) return <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Memuat bagan organisasi...</div>;
  const roots = (childrenByParent.get(null) ?? []).concat(childrenByParent.get('') ?? []);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Users size={22}/></div><div><h2 className="font-bold">Bagan Struktur Organisasi Sekolah</h2><p className="mt-0.5 text-xs text-muted-foreground">Bagan bertingkat dengan foto, nama, NIP, dan garis hubungan atasan langsung</p></div></div>
        {canManage && !editing && <button type="button" onClick={() => { setEditing(true); setNotice(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"><Users size={17}/> Kelola Struktur <ChevronDown size={16}/></button>}
        {canManage && editing && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(false); void load(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><X size={16}/> Batal</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={17}/>{saving ? 'Menyimpan...' : 'Simpan Perubahan'} <Check size={16}/></button></div>}
      </header>
      {editing && <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><ImagePlus size={18} className="mt-0.5 shrink-0"/><p><b>Mode pengelolaan aktif.</b> Ubah jabatan, pilih atasan langsung, tentukan guru/pegawai, atau klik <b>Ganti foto</b> pada kartu. Foto yang diunggah juga memperbarui foto profil akun guru terkait.</p></div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
      {editing && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"><div><p className="text-sm font-bold">Tambah posisi organisasi</p><p className="text-xs text-muted-foreground">Posisi baru otomatis ditempatkan di bawah Kepala Sekolah. Atasan dapat diubah pada kartu.</p></div><button type="button" onClick={addPosition} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-blue-400 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200"><Plus size={17}/> Tambah Jabatan</button></div>}
      <div className="overflow-x-auto rounded-2xl border bg-muted/20 p-4 sm:p-6">
        <div className="mx-auto flex min-w-[320px] max-w-[1180px] flex-col items-center pb-5">
          {roots.length ? roots.map((root) => renderNode(root)) : <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Bagan struktur organisasi belum diisi.</div>}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Foto dan identitas mengikuti data profil guru/pegawai. NIP ditampilkan jika tersedia. Penetapan jabatan tidak mengubah role akun EduFlow.</p>
    </section>
  );
}
