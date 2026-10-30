'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type TeachingJournalAgenda } from '../lib/api';
import { PageHeader } from './ui/page-header';

type JournalForm = { learningObjectives: string; material: string; learningActivities: string; learningOutcome: string; reflection: string; issueNotes: string };
const emptyForm: JournalForm = { learningObjectives: '', material: '', learningActivities: '', learningOutcome: '', reflection: '', issueNotes: '' };
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function statusLabel(status: string) { return status === 'SUBMITTED' ? 'Terkirim' : status === 'LOCKED' ? 'Terkunci' : status === 'DRAFT' ? 'Draft' : 'Belum diisi'; }

export function TeacherJournals() {
  const [date,setDate] = useState(localDate);
  const [agendas,setAgendas] = useState<TeachingJournalAgenda[]>([]);
  const [selectedId,setSelectedId] = useState('');
  const [form,setForm] = useState<JournalForm>(emptyForm);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const selected = useMemo(() => agendas.find(a => a.id === selectedId) ?? null,[agendas,selectedId]);

  async function load(targetDate = date) {
    setLoading(true); setError('');
    try {
      const response = await api.getMyTeachingJournals(targetDate);
      setAgendas(response.data);
      setSelectedId(current => response.data.some(a => a.id === current) ? current : response.data[0]?.id ?? '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat agenda.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(date); }, [date]);
  useEffect(() => {
    const j = selected?.teachingJournal;
    setForm(j ? { learningObjectives:j.learningObjectives ?? '', material:j.material ?? '', learningActivities:j.learningActivities ?? '', learningOutcome:j.learningOutcome ?? '', reflection:j.reflection ?? '', issueNotes:j.issueNotes ?? '' } : emptyForm);
    setMessage('');
  }, [selectedId, selected?.teachingJournal?.updatedAt]);

  async function save(submit = false) {
    if (!selected) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await api.saveTeachingJournal(selected.id,form);
      if (submit) await api.submitTeachingJournal(selected.id);
      setMessage(submit ? 'Jurnal berhasil dikirim.' : 'Draft jurnal berhasil disimpan.');
      await load(date);
    } catch (e) { setError(e instanceof Error ? e.message : 'Jurnal gagal disimpan.'); }
    finally { setSaving(false); }
  }
  const locked = Boolean(selected && (!selected.canEditJournal || ['SUBMITTED','LOCKED'].includes(selected.teachingJournal?.status ?? '')));
  const fields = [
    ['learningObjectives','Tujuan pembelajaran',false],['material','Materi pembelajaran *',true],
    ['learningActivities','Kegiatan pembelajaran',false],['learningOutcome','Hasil pembelajaran',false],
    ['reflection','Refleksi guru',false],['issueNotes','Kendala / catatan',false],
  ] as const;

  return <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
    <PageHeader eyebrow="Guru" title="Jurnal Harian" description="Catat pelaksanaan pembelajaran berdasarkan agenda mengajar yang sudah digenerate. Presensi dikelola terpisah." />
    <div className="surface-card mt-5 rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-1 text-sm font-bold text-ink">Tanggal<input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <p className="text-sm text-muted">{agendas.length} agenda mengajar</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {loading ? <p className="py-8 text-sm text-muted">Memuat agenda...</p> : agendas.length === 0 ? <div className="my-5 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center"><p className="font-bold text-ink">Belum ada agenda mengajar pada tanggal ini</p><p className="mt-1 text-sm text-muted">Jadwal mingguan tidak ditampilkan sebagai agenda sebelum agenda harian digenerate.</p></div> : <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-2">{agendas.map(a=><button key={a.id} type="button" onClick={()=>setSelectedId(a.id)} className={`rounded-2xl border p-3 text-left transition ${selectedId===a.id?'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30':'border-[var(--border)] hover:border-blue-300'}`}><span className="block text-xs font-bold text-muted">{a.schedule?.startsAt ?? a.effectiveStartsAt ?? '--:--'} – {a.schedule?.endsAt ?? a.effectiveEndsAt ?? '--:--'}</span><span className="mt-1 block font-black text-ink">{a.subject.name}</span><span className="block text-sm text-muted">{a.class.name}</span><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{statusLabel(a.journalStatus)}</span></button>)}</div>
        {selected && <div className="min-w-0"><h2 className="text-xl font-black text-ink">{selected.subject.name} · {selected.class.name}</h2><p className="mt-1 text-sm text-muted">Guru: {selected.substituteTeacher?.name ?? selected.teacher.name}</p>
          {locked && <p className="my-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">Jurnal sudah dikirim/dikunci atau agenda ini bukan penugasan Anda. Mode baca saja.</p>}
          <div className="mt-4 grid gap-4">{fields.map(([key,label,required])=><label key={key} className="grid gap-1 text-sm font-bold text-ink">{label}<textarea className="form-input min-h-24 resize-y" disabled={locked||saving} required={required} value={form[key]} onChange={e=>setForm(current=>({...current,[key]:e.target.value}))}/></label>)}</div>
          {!locked && <div className="mt-5 flex flex-wrap gap-3"><button className="primary-button" type="button" disabled={saving} onClick={()=>void save()}>{saving?'Menyimpan...':'Simpan Draft'}</button><button className="secondary-button" type="button" disabled={saving||!form.material.trim()} onClick={()=>{if(window.confirm('Kirim jurnal ini? Setelah dikirim, jurnal tidak dapat diedit melalui form biasa.')) void save(true);}}>{saving?'Memproses...':'Kirim Jurnal'}</button></div>}
        </div>}
      </div>}
    </div>
  </section>;
}
