'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Attendance, type AttendanceStatus, type DailyAgenda } from '../lib/api';
import { useToast } from './ui/toast';

const statuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hadir' }, { value: 'SICK', label: 'Sakit' }, { value: 'EXCUSED', label: 'Izin' }, { value: 'ABSENT', label: 'Alpha' },
];
const today = () => new Date().toISOString().slice(0, 10);

export function TeacherAttendance() {
  const toast = useToast(); const cameraRef = useRef<HTMLInputElement>(null);
  const [agendas, setAgendas] = useState<DailyAgenda[]>([]); const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [photo, setPhoto] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  async function load() { try { setAgendas((await api.getMyAgendas(today())).data); } catch (error) { toast.error(error instanceof Error ? error.message : 'Agenda hari ini gagal dimuat.'); } }
  useEffect(() => { void load(); }, []);
  async function open(agenda: DailyAgenda) { try { const response = await api.openClass(agenda.id); setAttendance(response.data); } catch (error) { toast.error(error instanceof Error ? error.message : 'Kelas gagal dibuka.'); } }
  async function submit() { if (!attendance) return; setSaving(true); try { let current = attendance; if (photo) current = (await api.uploadAttendanceClassPhoto(current.id, photo)).data; await api.submitAttendance({ attendanceId: current.id, items: current.items.map((item) => ({ attendanceItemId: item.id, status: item.status, notes: item.notes ?? undefined })) }); toast.success('Presensi tersimpan. Ringkasan kehadiran diproses untuk wali murid.'); setAttendance(null); setPhoto(null); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Presensi gagal disimpan.'); } finally { setSaving(false); } }
  function update(id: string, status: AttendanceStatus) { setAttendance((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, status } : item) } : current); }
  if (attendance) return <section className="mt-6 space-y-4"><div className="surface-card rounded-[2rem] p-5"><h2 className="text-xl font-black">Presensi Siswa</h2><p className="mt-1 text-sm text-muted">Semua siswa dimulai sebagai Hadir. Ubah bila Izin, Sakit, atau Alpha.</p><div className="mt-4 grid grid-cols-2 gap-2"><button className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white" onClick={() => cameraRef.current?.click()} type="button">Kamera Kelas</button><input accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} ref={cameraRef} type="file" /></div>{photo ? <p className="mt-2 text-xs font-bold text-muted">Foto: {photo.name}</p> : null}</div><div className="surface-card rounded-[2rem] p-4">{attendance.items.map((item) => <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b py-3 last:border-0" key={item.id}><p className="text-sm font-bold">{item.student.name}</p><select className="rounded-xl border px-3 py-2 text-sm" onChange={(event) => update(item.id, event.target.value as AttendanceStatus)} value={item.status}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>)}<button className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={saving} onClick={() => void submit()} type="button">{saving ? 'Menyimpan...' : 'Selesaikan Presensi'}</button></div></section>;
  return <section className="mt-6 grid gap-3">{agendas.map((agenda) => <article className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[2rem] p-5" key={agenda.id}><div><p className="text-xs font-black text-brand-700">{agenda.schedule?.startsAt ?? 'Jam belum diatur'} · {agenda.class.name}</p><h2 className="mt-1 text-lg font-black">{agenda.subject.name}</h2></div><button className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white" onClick={() => void open(agenda)} type="button">Buka Presensi</button></article>)}{!agendas.length ? <p className="surface-card rounded-2xl p-5 text-sm text-muted">Tidak ada agenda mengajar hari ini.</p> : null}</section>;
}
