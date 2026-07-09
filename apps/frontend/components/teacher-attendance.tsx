'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Attendance, type AttendanceStatus, type DailyAgenda } from '../lib/api';
import { useToast } from './ui/toast';
import { CameraCaptureButton } from './ui/camera-capture-button';

const statuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hadir' }, { value: 'SICK', label: 'Sakit' }, { value: 'EXCUSED', label: 'Izin' }, { value: 'ABSENT', label: 'Alpha' },
];
const today = () => new Date().toISOString().slice(0, 10);

export function TeacherAttendance() {
  const toast = useToast(); const cameraRef = useRef<HTMLInputElement>(null);
  const [agendas, setAgendas] = useState<DailyAgenda[]>([]); const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [photo, setPhoto] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState({
    teacherPresent: true,
    studentAttendanceDone: true,
    materialFilled: false,
    classPhotoDone: false,
    issueNotes: '',
  });
  async function load() { try { setAgendas((await api.getMyAgendas(today())).data); } catch (error) { toast.error(error instanceof Error ? error.message : 'Agenda hari ini gagal dimuat.'); } }
  useEffect(() => { void load(); }, []);
  async function open(agenda: DailyAgenda) { try { const response = await api.openClass(agenda.id); setAttendance(response.data); setChecklist({ teacherPresent: true, studentAttendanceDone: true, materialFilled: false, classPhotoDone: Boolean(response.data.classPhotoName), issueNotes: '' }); } catch (error) { toast.error(error instanceof Error ? error.message : 'Kelas gagal dibuka.'); } }
  async function submit() { if (!attendance) return; setSaving(true); try { let current = attendance; if (photo) current = (await api.uploadAttendanceClassPhoto(current.id, photo)).data; await api.submitAttendance({ attendanceId: current.id, teacherPresent: checklist.teacherPresent, studentAttendanceDone: checklist.studentAttendanceDone, materialFilled: checklist.materialFilled, classPhotoDone: checklist.classPhotoDone || Boolean(photo) || Boolean(current.classPhotoName), issueNotes: checklist.issueNotes || undefined, items: current.items.map((item) => ({ attendanceItemId: item.id, status: item.status, notes: item.notes ?? undefined })) }); toast.success('Presensi tersimpan. Ringkasan kehadiran diproses untuk wali murid.'); setAttendance(null); setPhoto(null); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Presensi gagal disimpan.'); } finally { setSaving(false); } }
  function update(id: string, status: AttendanceStatus) { setAttendance((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, status } : item) } : current); }
  if (attendance) return <section className="mt-6 space-y-4"><div className="surface-card rounded-[2rem] p-5"><h2 className="text-xl font-black">Presensi Siswa</h2><p className="mt-1 text-sm text-muted">Semua siswa dimulai sebagai Hadir. Ubah bila Izin, Sakit, atau Alpha.</p><div className="mt-4"><CameraCaptureButton onClick={() => cameraRef.current?.click()}>Foto Kelas</CameraCaptureButton><input accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { setPhoto(event.target.files?.[0] ?? null); setChecklist((current) => ({ ...current, classPhotoDone: Boolean(event.target.files?.[0]) })); }} ref={cameraRef} type="file" /></div>{photo ? <p className="mt-2 text-xs font-bold text-muted">Foto: {photo.name}</p> : null}</div><div className="surface-card rounded-[2rem] p-5"><h3 className="text-base font-black">Checklist KBM</h3><div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">{(['teacherPresent', 'studentAttendanceDone', 'materialFilled', 'classPhotoDone'] as const).map((key) => <label className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 px-3 py-2" key={key}><input checked={checklist[key]} className="size-4 accent-brand-600" onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" />{getChecklistLabel(key)}</label>)}</div><label className="mt-3 grid gap-2 text-sm font-bold">Catatan Kendala<textarea className="min-h-20 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" onChange={(event) => setChecklist((current) => ({ ...current, issueNotes: event.target.value }))} placeholder="Opsional: kendala kelas, perpindahan ruang, perangkat, atau catatan KBM." value={checklist.issueNotes} /></label></div><div className="surface-card rounded-[2rem] p-4">{attendance.items.map((item) => <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b py-3 last:border-0" key={item.id}><p className="text-sm font-bold">{item.student.name}</p><select className="rounded-xl border px-3 py-2 text-sm" onChange={(event) => update(item.id, event.target.value as AttendanceStatus)} value={item.status}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>)}<button className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={saving} onClick={() => void submit()} type="button">{saving ? 'Menyimpan...' : 'Selesaikan Presensi'}</button></div></section>;
  return <section className="mt-6 grid gap-3">{agendas.map((agenda) => <article className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[2rem] p-5" key={agenda.id}><div><p className="text-xs font-black text-brand-700">{agenda.schedule?.startsAt ?? 'Jam belum diatur'} · {agenda.class.name}</p><h2 className="mt-1 text-lg font-black">{agenda.subject.name}</h2>{agenda.substituteTeacher ? <p className="mt-1 text-xs font-black text-amber-700">Guru pengganti: {agenda.substituteTeacher.name}</p> : null}</div><button className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white" onClick={() => void open(agenda)} type="button">Buka Presensi</button></article>)}{!agendas.length ? <p className="surface-card rounded-2xl p-5 text-sm text-muted">Tidak ada agenda mengajar hari ini.</p> : null}</section>;
}

function getChecklistLabel(key: 'teacherPresent' | 'studentAttendanceDone' | 'materialFilled' | 'classPhotoDone') {
  const labels = {
    teacherPresent: 'Guru hadir',
    studentAttendanceDone: 'Presensi siswa selesai',
    materialFilled: 'Materi/catatan KBM terisi',
    classPhotoDone: 'Foto kelas tersedia',
  };
  return labels[key];
}
