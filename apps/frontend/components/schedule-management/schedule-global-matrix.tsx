'use client';

import { useMemo, useState } from 'react';
import type { AcademicTimeSlot, ClassTimeSlotActivity, Schedule, SchoolClass, SchoolYear, Semester, Teacher } from '../../lib/api';
import { PrintPreview } from '../print/print-preview';
import { Button } from '../ui/button';
import { dayOptions } from './schedule-management-utils';

type Props = {
  schedules: Schedule[];
  classes: SchoolClass[];
  teachers: Teacher[];
  timeSlots: AcademicTimeSlot[];
  activities: ClassTimeSlotActivity[];
  schoolYear?: SchoolYear;
  semester?: Semester;
  viewDate: string;
};

type EffectiveSchedule = Schedule & { hasRevision?: boolean };

const formatTime = (value: string) => value?.slice(0, 5) ?? '';

export function ScheduleGlobalMatrix({ schedules, classes, teachers, timeSlots, activities, schoolYear, semester, viewDate }: Props) {
  const [preview, setPreview] = useState(false);
  const activeClasses = useMemo(() => classes.filter((item) => item.schoolYearId === schoolYear?.id).sort((a, b) => (a.grade ?? '').localeCompare(b.grade ?? '', 'id', { numeric: true }) || a.name.localeCompare(b.name, 'id', { numeric: true })), [classes, schoolYear?.id]);
  const activeSchedules = useMemo(() => schedules.map((schedule) => {
    const revision = schedule.revisions?.filter((item) => new Date(item.effectiveFrom).getTime() <= new Date(`${viewDate}T23:59:59`).getTime()).at(-1);
    return revision ? { ...schedule, ...revision, class: revision.class, subject: revision.subject, teacher: revision.teacher, timeSlot: revision.timeSlot, hasRevision: true } as EffectiveSchedule : schedule as EffectiveSchedule;
  }).filter((item) => item.schoolYearId === schoolYear?.id && item.semesterId === semester?.id && activeClasses.some((schoolClass) => schoolClass.id === item.classId)), [activeClasses, schedules, schoolYear?.id, semester?.id, viewDate]);
  const teacherCodes = useMemo(() => new Map([...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id')).map((teacher, index) => [teacher.id, index + 1])), [teachers]);
  const days = dayOptions.filter((day) => day.value <= 6 && (timeSlots.some((slot) => slot.schoolYearId === schoolYear?.id && slot.dayOfWeek === day.value && slot.isActive) || activeSchedules.some((schedule) => schedule.dayOfWeek === day.value)));
  const rowsByDay = days.map((day) => {
    const slots = timeSlots.filter((slot) => slot.schoolYearId === schoolYear?.id && slot.dayOfWeek === day.value && slot.isActive).sort((a, b) => (a.periodNumber ?? 999) - (b.periodNumber ?? 999) || a.startsAt.localeCompare(b.startsAt));
    const times = new Map<string, { id: string; name: string; startsAt: string; endsAt: string; periodNumber?: number | null; slotId?: string }>();
    slots.forEach((slot) => times.set(`${slot.startsAt}-${slot.endsAt}`, { id: slot.id, name: slot.name, startsAt: slot.startsAt, endsAt: slot.endsAt, periodNumber: slot.periodNumber, slotId: slot.id }));
    activeSchedules.filter((schedule) => schedule.dayOfWeek === day.value).forEach((schedule) => {
      const key = `${schedule.startsAt}-${schedule.endsAt}`;
      if (!times.has(key)) times.set(key, { id: key, name: '', startsAt: schedule.startsAt, endsAt: schedule.endsAt, periodNumber: null, slotId: schedule.timeSlotId ?? undefined });
    });
    const rows = [...times.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { ...day, rows };
  });
  const grades = [...new Set(activeClasses.map((item) => item.grade ?? 'Lainnya'))];
  const matrixCell = (schoolClass: SchoolClass, day: number, row: (typeof rowsByDay)[number]['rows'][number]) => {
    const activity = activities.find((item) => item.classId === schoolClass.id && item.timeSlotId === row.slotId);
    if (activity) return activity.type === 'RELIGIOUS' ? 'SHOLAT' : 'ISTIRAHAT';
    const entries = activeSchedules.filter((item) => item.classId === schoolClass.id && item.dayOfWeek === day && (item.timeSlotId && row.slotId ? item.timeSlotId === row.slotId : item.startsAt === row.startsAt && item.endsAt === row.endsAt));
    return entries.map((item) => teacherCodes.get(item.teacherId) ?? '—').join(' / ') || '';
  };
  const pages = [
    <div key="global-schedule" className="text-[6px] leading-tight">
      <header className="mb-2 border-b-2 border-slate-900 pb-2 text-center">
        <h2 className="text-[11px] font-black uppercase">Jadwal Pelajaran Sekolah</h2>
        <p className="text-[8px] font-bold">{schoolYear?.name ?? 'Tahun Pelajaran'} · {semester?.type === 'ODD' ? 'Semester Ganjil' : semester?.type === 'EVEN' ? 'Semester Genap' : 'Semester'}</p>
        <p className="text-[7px]">Berlaku per {viewDate}</p>
      </header>
      {rowsByDay.map((day) => <section className="mb-2" key={day.value}>
        <h3 className="mb-1 text-[8px] font-black uppercase">{day.label}</h3>
        <table className="w-full table-fixed border-collapse">
          <thead><tr><th className="w-7 border border-slate-600 p-[2px]">Jam</th><th className="w-14 border border-slate-600 p-[2px]">Waktu</th>{grades.map((grade) => <th className="border border-slate-600 p-[2px]" colSpan={activeClasses.filter((item) => (item.grade ?? 'Lainnya') === grade).length} key={grade}>Kelas {grade}</th>)}</tr><tr><th className="border border-slate-600 p-[2px]">No</th><th className="border border-slate-600 p-[2px]">Mulai–Selesai</th>{activeClasses.map((schoolClass) => <th className="border border-slate-600 p-[2px]" key={schoolClass.id}>{schoolClass.name}</th>)}</tr></thead>
          <tbody>{day.rows.map((row, index) => <tr key={row.id}><td className="border border-slate-500 p-[2px] text-center">{row.periodNumber ?? index + 1}</td><td className="border border-slate-500 p-[2px] text-center">{formatTime(row.startsAt)}–{formatTime(row.endsAt)}</td>{activeClasses.map((schoolClass) => <td className="border border-slate-500 p-[2px] text-center font-bold" key={schoolClass.id}>{matrixCell(schoolClass, day.value, row)}</td>)}</tr>)}</tbody>
        </table>
      </section>)}
      <section className="mt-2 border-t border-slate-700 pt-2">
        <h3 className="mb-1 text-[8px] font-black">KETERANGAN KODE GURU</h3>
        <div className="grid grid-cols-5 gap-x-2 gap-y-[2px]">{[...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id')).map((teacher) => <p key={teacher.id}>{teacherCodes.get(teacher.id)}. {teacher.name}</p>)}</div>
        <p className="mt-1">SHOLAT = Kegiatan keagamaan · ISTIRAHAT = Waktu istirahat · Sel kosong = Tidak ada jadwal</p>
      </section>
    </div>,
  ];
  const excelDownload = () => {
    const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = rowsByDay.map((day) => `<h3>${day.label}</h3><table border="1"><tr><th>Jam</th><th>Waktu</th>${activeClasses.map((item) => `<th>${escape(item.name)}</th>`).join('')}</tr>${day.rows.map((row, index) => `<tr><td>${row.periodNumber ?? index + 1}</td><td>${formatTime(row.startsAt)}-${formatTime(row.endsAt)}</td>${activeClasses.map((item) => `<td>${escape(matrixCell(item, day.value, row))}</td>`).join('')}</tr>`).join('')}</table>`).join('');
    const legend = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id')).map((teacher) => `<li>${teacherCodes.get(teacher.id)}. ${escape(teacher.name)}</li>`).join('');
    const blob = new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body><h2>Jadwal Pelajaran Sekolah</h2><p>${escape(schoolYear?.name)} · ${escape(semester?.type === 'ODD' ? 'Semester Ganjil' : semester?.type === 'EVEN' ? 'Semester Genap' : 'Semester')}</p>${html}<h3>Keterangan Kode Guru</h3><ol>${legend}</ol></body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'jadwal-global-sekolah.xls'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900 dark:text-[var(--text)]">Jadwal Global Sekolah</h2><p className="text-xs text-muted">Seluruh rombel dalam satu matriks, kode angka menunjukkan guru pengampu.</p></div><Button disabled={!activeClasses.length || !activeSchedules.length} onClick={() => setPreview(true)} size="sm">Preview Cetak Global</Button></div>
    {!activeClasses.length || !activeSchedules.length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-muted dark:bg-[var(--surface-soft)]">Belum ada jadwal untuk tahun ajaran dan semester yang dipilih.</p> : <div className="mt-4 overflow-x-auto"><p className="mb-2 text-xs text-muted">{activeClasses.length} rombel · {activeSchedules.length} jadwal · {days.length} hari</p><div className="min-w-[900px] space-y-4">{rowsByDay.map((day) => <div key={day.value}><h3 className="mb-1 text-sm font-black">{day.label}</h3><table className="w-full border-collapse text-[10px]"><thead><tr><th className="border p-1">Jam</th><th className="border p-1">Waktu</th>{activeClasses.map((item) => <th className="border p-1" key={item.id}>{item.name}</th>)}</tr></thead><tbody>{day.rows.map((row, index) => <tr key={row.id}><td className="border p-1 text-center">{row.periodNumber ?? index + 1}</td><td className="border p-1 text-center">{formatTime(row.startsAt)}–{formatTime(row.endsAt)}</td>{activeClasses.map((item) => <td className="border p-1 text-center" key={item.id}>{matrixCell(item, day.value, row)}</td>)}</tr>)}</tbody></table></div>)}</div></div>}
    {preview ? <PrintPreview title="Jadwal Global Sekolah" pages={pages} paperSize="A3_LANDSCAPE" paperId="opsek-global-schedule" footerText="Jadwal global sekolah" onClose={() => setPreview(false)} onDownloadExcel={excelDownload} /> : null}
  </section>;
}
