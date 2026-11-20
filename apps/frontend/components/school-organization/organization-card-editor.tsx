'use client';

import { useEffect } from 'react';
import { ImagePlus, Save, Trash2, X } from 'lucide-react';

export type OrganizationEditorPosition = { id: string; title: string; personName?: string | null; teacherId?: string | null; category: string; nip?: string | null; photoUrl?: string | null; locked?: boolean };
export type OrganizationEditorTeacher = { id: string; name: string; nip?: string | null; photoUrl?: string | null };

const categoryOptions = ['Pimpinan', 'Wakil Kepala Sekolah', 'Tenaga Kependidikan', 'Koordinator', 'Jabatan Lainnya'];

export function OrganizationCardEditor({ item, teacher, teachers, positions, uploading, onChange, onPhoto, onDelete, onClose }: {
  item: OrganizationEditorPosition; teacher?: OrganizationEditorTeacher; teachers: OrganizationEditorTeacher[]; positions: OrganizationEditorPosition[]; uploading?: boolean;
  onChange: (patch: Partial<OrganizationEditorPosition>) => void; onPhoto: (file?: File) => void; onDelete: () => void; onClose: () => void;
}) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="org-card-editor-title" className="overflow-y-auto rounded-xl border border-border bg-white p-3 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100" style={{ width: 400, maxWidth: 'calc(100vw - 24px)', maxHeight: 'min(600px, calc(100dvh - 32px))' , opacity: 1 }}>
      <header className="mb-2 flex items-center justify-between"><div><h2 id="org-card-editor-title" className="text-base font-bold">Edit Kartu Jabatan</h2><p className="text-xs text-muted-foreground">Perubahan tidak menggeser atau menutupi bagan.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Tutup"><X size={18}/></button></header>
      <div className="space-y-2">
        <label className="block space-y-1 text-xs font-semibold"><span>Nama Jabatan</span><input list="school-organization-position-options" value={item.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Pilih atau ketik jabatan" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal"/><datalist id="school-organization-position-options">{[...new Set([...categoryOptions, ...positions.map((position) => position.title).filter(Boolean)])].map((option) => <option key={option} value={option}/>)}</datalist></label>
        <label className="block space-y-1 text-xs font-semibold"><span>Kelompok Jabatan</span><select value={item.category} onChange={(event) => onChange({ category: event.target.value })} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
        {item.category === 'Jabatan Lainnya' && <label className="block space-y-1 text-xs font-semibold"><span>Nama Jabatan Baru</span><input value={item.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Tulis nama jabatan baru" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal" autoFocus/></label>}
        <label className="block space-y-1 text-xs font-semibold"><span>Guru/Pegawai</span><select value={item.teacherId ?? ''} onChange={(event) => { const selected = teachers.find((person) => person.id === event.target.value); onChange({ teacherId: selected?.id ?? null, personName: selected?.name ?? '', nip: selected?.nip ?? null, photoUrl: selected?.photoUrl ?? null }); }} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal"><option value="">Belum ditentukan / manual</option>{teachers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.nip ? ` · ${person.nip}` : ''}</option>)}</select></label>
        <label className="block space-y-1 text-xs font-semibold"><span>Nama</span><input value={item.personName ?? teacher?.name ?? ''} onChange={(event) => onChange({ personName: event.target.value })} placeholder="Nama guru/pegawai" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal"/></label>
        <label className="block space-y-1 text-xs font-semibold"><span>NIP</span><input value={item.nip ?? teacher?.nip ?? ''} onChange={(event) => onChange({ nip: event.target.value })} placeholder="NIP (opsional)" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal"/></label>
        {item.teacherId && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"><ImagePlus size={15}/>{uploading ? 'Mengunggah foto…' : 'Ganti foto'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(event) => { onPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label>}
      </div>
      <footer className="mt-3 flex items-center justify-between border-t pt-2.5"><div>{!item.locked && <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14}/> Hapus</button>}</div><button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><Save size={14}/> Selesai</button></footer>
    </section>
  </div>;
}
