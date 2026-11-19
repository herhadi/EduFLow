'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

type Teacher = { id: string; name: string; nip?: string | null };
type OrganizationClass = { id: string; name: string; teacherId?: string | null };

type HomeroomCardEditorProps = {
  selectedClass: OrganizationClass;
  teachers: Teacher[];
  onChange: (classId: string, teacherId: string) => void;
  onClose: () => void;
};

export function HomeroomCardEditor({ selectedClass, teachers, onChange, onClose }: HomeroomCardEditorProps) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="homeroom-editor-title" className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between"><div><h2 id="homeroom-editor-title" className="text-base font-bold">Edit Wali Kelas</h2><p className="text-xs text-muted-foreground">Rombel {selectedClass.name}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Tutup"><X size={18}/></button></header>
        <label className="block space-y-1 text-xs font-semibold"><span>Guru Wali Kelas</span><select value={selectedClass.teacherId ?? ''} onChange={(event) => onChange(selectedClass.id, event.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal"><option value="">Belum ditentukan</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.nip ? ` · ${teacher.nip}` : ''}</option>)}</select></label>
        <p className="mt-3 text-xs text-muted-foreground">Data guru, NIP, dan foto mengikuti profil guru.</p>
        <footer className="mt-5 flex justify-end border-t pt-3"><button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Selesai</button></footer>
      </section>
    </div>
  );
}
