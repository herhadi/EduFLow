'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Teacher = { id: string; name: string; nip?: string | null };
type OrganizationClass = { id: string; name: string; teacherId?: string | null };

type HomeroomCardEditorProps = {
  selectedClass: OrganizationClass;
  classes: OrganizationClass[];
  teachers: Teacher[];
  onChange: (classId: string, teacherId: string) => void;
  onClose: () => void;
};

export function HomeroomCardEditor({ selectedClass, classes, teachers, onChange, onClose }: HomeroomCardEditorProps) {
  const [selectedClassId, setSelectedClassId] = useState(selectedClass.id);
  const activeClass = classes.find((item) => item.id === selectedClassId) ?? selectedClass;
  useEffect(() => { setSelectedClassId(selectedClass.id); }, [selectedClass.id]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="homeroom-editor-title" className="w-full max-w-sm rounded-xl border border-border bg-white p-3 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <header className="mb-3 flex items-center justify-between"><div><h2 id="homeroom-editor-title" className="text-base font-bold">Edit Wali Kelas</h2><p className="text-xs text-muted-foreground">Pilih rombel dan guru wali kelas</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Tutup"><X size={18}/></button></header>
        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-semibold"><span>Rombel</span><select value={activeClass.id} onChange={(event) => setSelectedClassId(event.target.value)} className="min-h-9 w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-semibold"><span>Guru Wali Kelas</span><select value={activeClass.teacherId ?? ''} onChange={(event) => onChange(activeClass.id, event.target.value)} className="min-h-9 w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm font-normal"><option value="">Belum ditentukan</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.nip ? ` · ${teacher.nip}` : ''}</option>)}</select></label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Daftar rombel mengikuti data kelas aktif di basis data. Data guru, NIP, dan foto mengikuti profil guru.</p>
        <footer className="mt-3 flex justify-end border-t pt-2.5"><button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Selesai</button></footer>
      </section>
    </div>
  );
}
