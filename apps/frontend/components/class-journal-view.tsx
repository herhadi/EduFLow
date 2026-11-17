'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type ClassJournal, type SchoolClass } from '../lib/api';
import { PageHeader } from './ui/page-header';
import { getSchoolDateKey } from '../lib/school-time';

function localDate() { return getSchoolDateKey(); }
function label(status:string){return status==='SUBMITTED'?'Terkirim':status==='LOCKED'?'Terkunci':status==='DRAFT'?'Draft':'Belum diisi';}
function gradeOf(schoolClass:SchoolClass){return schoolClass.grade?.trim() || schoolClass.name.trim().split(/\s+/)[0] || 'Lainnya';}
function gradeOrder(value:string){const roman:Record<string,number>={VII:7,VIII:8,IX:9,X:10,XI:11,XII:12};return roman[value.toUpperCase()] ?? (Number(value) || 99);}

export function ClassJournalView({canWriteNotes=false,schoolWide=false}:{canWriteNotes?:boolean;schoolWide?:boolean}) {
 const [classes,setClasses]=useState<SchoolClass[]>([]); const [grade,setGrade]=useState(''); const [classId,setClassId]=useState(''); const [date,setDate]=useState(localDate());
 const [journal,setJournal]=useState<ClassJournal|null>(null); const [note,setNote]=useState(''); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [message,setMessage]=useState('');
 const gradeOptions=useMemo(()=>Array.from(new Set(classes.map(gradeOf))).sort((a,b)=>gradeOrder(a)-gradeOrder(b)),[classes]);
 const rombelOptions=useMemo(()=>classes.filter(c=>gradeOf(c)===grade).sort((a,b)=>a.name.localeCompare(b.name,'id',{numeric:true})),[classes,grade]);
 useEffect(()=>{let active=true;
   const load=async()=>{try{
     if(canWriteNotes){const response=await api.getMyHomeroom(); const assigned=response.data.class ? [response.data.class] : []; if(!active)return; setClasses(assigned); if(assigned[0]){setGrade(gradeOf(assigned[0]));setClassId(assigned[0].id);}}
     else {const response=await api.getClasses(); if(!active)return; setClasses(response.data);}
   }catch(e){if(active)setError(e instanceof Error?e.message:'Gagal memuat kelas.');}finally{if(active)setLoading(false);}};
   void load(); return()=>{active=false;};
 },[canWriteNotes]);
 useEffect(()=>{let active=true;if(!classId){setJournal(null);setLoading(false);return;}setLoading(true);setError('');
   api.getClassJournal(classId,{date}).then(r=>{if(active)setJournal(r.data);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Gagal memuat jurnal kelas.');}).finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;};
 },[classId,date]);
 async function saveNote(){if(!journal||!note.trim())return;setError('');setMessage('');try{await api.createClassJournalNote(classId,{date,content:note.trim()});setNote('');setJournal((await api.getClassJournal(classId,{date})).data);setMessage('Catatan wali kelas disimpan.');}catch(e){setError(e instanceof Error?e.message:'Catatan gagal disimpan.');}}
 return <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
  <PageHeader eyebrow={schoolWide?'Monitoring Akademik':'Wali Kelas'} title={schoolWide?'Monitoring Jurnal Kelas':'Jurnal Kelas'} description="Pantau agenda mengajar, jurnal pembelajaran, status presensi, dan catatan wali kelas. Status jurnal dan presensi ditampilkan terpisah."/>
  <div className="surface-card mt-5 rounded-3xl p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-3">
   <label className="grid gap-1 text-sm font-bold text-ink">Tingkat<select className="form-input" value={grade} onChange={e=>{setGrade(e.target.value);setClassId('');setJournal(null);}} disabled={canWriteNotes||loading}><option value="">Pilih tingkat</option>{gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
   <label className="grid gap-1 text-sm font-bold text-ink">Rombel<select className="form-input" value={classId} onChange={e=>setClassId(e.target.value)} disabled={canWriteNotes||!grade||loading}><option value="">{grade?'Pilih rombel':'Pilih tingkat terlebih dahulu'}</option>{rombelOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="grid gap-1 text-sm font-bold text-ink">Tanggal<input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
  </div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
  {loading?<p className="py-8 text-sm text-muted">Memuat jurnal kelas...</p>:!classId?<p className="py-8 text-center text-sm text-muted">Pilih tingkat dan rombel untuk melihat monitoring jurnal.</p>:journal&&<>
   <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Total agenda',journal.summary.totalAgendas],['Jurnal terkirim',journal.summary.submittedJournals],['Draft',journal.summary.draftJournals],['Belum diisi',journal.summary.journalsNotStarted],['Presensi tersedia',journal.agendas.filter(a=>a.attendanceState!=='NOT_STARTED').length]].map(([name,value])=><div key={name} className="rounded-2xl border border-[var(--border)] p-3"><p className="text-xs font-bold text-muted">{name}</p><p className="mt-1 text-2xl font-black text-ink">{value}</p></div>)}</div>
   <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--border)]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase text-muted"><tr><th className="p-3">Waktu</th><th className="p-3">Mapel / Guru</th><th className="p-3">Materi</th><th className="p-3">Jurnal</th><th className="p-3">Presensi</th></tr></thead><tbody>{journal.agendas.map(a=><tr key={a.id} className="border-t border-[var(--border)] align-top"><td className="whitespace-nowrap p-3">{a.effectiveStartsAt??a.schedule?.startsAt??'--:--'}–{a.effectiveEndsAt??a.schedule?.endsAt??'--:--'}</td><td className="p-3"><strong className="block text-ink">{a.subject.name}</strong><span className="text-muted">{a.substituteTeacher?.name??a.teacher.name}</span></td><td className="max-w-xs whitespace-pre-wrap p-3">{a.teachingJournal?.material||'—'}</td><td className="p-3">{label(a.journalStatus)}</td><td className="p-3">{a.attendanceState==='NOT_STARTED'?'Belum ada':a.attendanceState}</td></tr>)}</tbody></table>{!journal.agendas.length&&<p className="p-6 text-center text-sm text-muted">Tidak ada agenda yang digenerate pada tanggal ini.</p>}</div>
   <div className="mt-6 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4"><h2 className="font-black text-ink">Catatan Wali Kelas</h2>{journal.notes.length?journal.notes.map(n=><article key={n.id} className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs font-bold text-muted">{n.date.slice(0,10)} · {n.authorTeacher.name}</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{n.content}</p></article>):<p className="mt-2 text-sm text-muted">Belum ada catatan untuk tanggal ini.</p>}</div>
   {canWriteNotes&&<div className="rounded-2xl border border-[var(--border)] p-4"><h2 className="font-black text-ink">Tambah Catatan</h2><textarea className="form-input mt-3 min-h-28" value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan kondisi kelas, tindak lanjut, atau informasi penting..."/><button className="primary-button mt-3" type="button" disabled={!note.trim()} onClick={()=>void saveNote()}>Simpan Catatan</button></div>}</div>
   <p className="mt-4 text-xs text-muted">Agenda terjadwal saja tidak otomatis dihitung sebagai KBM terlaksana. Monitoring ini bersifat baca; jurnal guru dan catatan wali kelas tetap dikelola oleh penulisnya.</p>
  </>}
  </div>
 </section>;
}
