'use client';

import { useMemo, useState, type CSSProperties } from 'react';
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
type MatrixRow = { id: string; name: string; startsAt: string; endsAt: string; periodNumber?: number | null; slotId?: string; slotType?: AcademicTimeSlot['type'] };
type MatrixCell = { value: string; colSpan: number; grade: string; activity: boolean };

const formatTime = (value: string) => value?.slice(0, 5) ?? '';
const gradeOrder = (grade: string) => { const known = ({ VII: 7, VIII: 8, IX: 9 } as Record<string, number>)[grade.toUpperCase()]; const numeric = Number(grade); return known ?? (Number.isFinite(numeric) && numeric > 0 ? numeric : 99); };
const classLabel = (name: string) => name.includes('-') ? name.slice(name.lastIndexOf('-') + 1).trim() : name;
const gradeTone = (grade: string) => {
  const value = grade.toUpperCase();
  if (value === 'VII' || value === '7') return { head: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-100', cell: 'bg-blue-50/70 dark:bg-blue-950/25' };
  if (value === 'VIII' || value === '8') return { head: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-100', cell: 'bg-emerald-50/70 dark:bg-emerald-950/25' };
  if (value === 'IX' || value === '9') return { head: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-100', cell: 'bg-amber-50/70 dark:bg-amber-950/25' };
  return { head: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', cell: 'bg-slate-50 dark:bg-slate-900/30' };
};

export function ScheduleGlobalMatrix({ schedules, classes, teachers, timeSlots, activities, schoolYear, semester, viewDate }: Props) {
  const [preview, setPreview] = useState(false);
  const activeClasses = useMemo(() => classes.filter((item) => item.schoolYearId === schoolYear?.id).sort((a, b) => gradeOrder(a.grade ?? '') - gradeOrder(b.grade ?? '') || a.name.localeCompare(b.name, 'id', { numeric: true })), [classes, schoolYear?.id]);
  const activeSchedules = useMemo(() => schedules.map((schedule) => {
    const revision = schedule.revisions?.filter((item) => new Date(item.effectiveFrom).getTime() <= new Date(`${viewDate}T23:59:59`).getTime()).at(-1);
    return revision ? { ...schedule, ...revision, class: revision.class, subject: revision.subject, teacher: revision.teacher, timeSlot: revision.timeSlot, hasRevision: true } as EffectiveSchedule : schedule as EffectiveSchedule;
  }).filter((item) => item.schoolYearId === schoolYear?.id && item.semesterId === semester?.id && activeClasses.some((schoolClass) => schoolClass.id === item.classId)), [activeClasses, schedules, schoolYear?.id, semester?.id, viewDate]);
  const sortedTeachers = useMemo(() => [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id')), [teachers]);
  const teacherCodes = useMemo(() => new Map(sortedTeachers.map((teacher, index) => [teacher.id, index + 1])), [sortedTeachers]);
  const days = dayOptions.filter((day) => day.value <= 6 && (timeSlots.some((slot) => slot.schoolYearId === schoolYear?.id && slot.dayOfWeek === day.value && slot.isActive) || activeSchedules.some((schedule) => schedule.dayOfWeek === day.value)));
  const rowsByDay = days.map((day) => {
    const slots = timeSlots.filter((slot) => slot.schoolYearId === schoolYear?.id && slot.dayOfWeek === day.value && slot.isActive).sort((a, b) => (a.periodNumber ?? 999) - (b.periodNumber ?? 999) || a.startsAt.localeCompare(b.startsAt));
    const times = new Map<string, MatrixRow>();
    slots.forEach((slot) => times.set(`${slot.startsAt}-${slot.endsAt}`, { id: slot.id, name: slot.name, startsAt: slot.startsAt, endsAt: slot.endsAt, periodNumber: slot.periodNumber, slotId: slot.id, slotType: slot.type }));
    activeSchedules.filter((schedule) => schedule.dayOfWeek === day.value).forEach((schedule) => {
      const key = `${schedule.startsAt}-${schedule.endsAt}`;
      const linkedSlot = timeSlots.find((slot) => slot.id === schedule.timeSlotId);
      if (!times.has(key)) times.set(key, { id: key, name: linkedSlot?.name ?? schedule.timeSlot?.name ?? '', startsAt: schedule.startsAt, endsAt: schedule.endsAt, periodNumber: null, slotId: schedule.timeSlotId ?? undefined, slotType: linkedSlot?.type });
    });
    const rows = [...times.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { ...day, rows };
  });
  const gradeGroups = [...new Set(activeClasses.map((item) => item.grade ?? 'Lainnya'))].map((grade) => ({ grade, classes: activeClasses.filter((item) => (item.grade ?? 'Lainnya') === grade) }));

  const cellValue = (schoolClass: SchoolClass, day: number, row: MatrixRow) => {
    const classActivity = activities.find((item) => item.classId === schoolClass.id && item.timeSlotId === row.slotId);
    if (row.slotType === 'BREAK') return 'ISTIRAHAT';
    if (row.slotType === 'RELIGIOUS') return classActivity?.type === 'RELIGIOUS' ? 'ISTIRAHAT/SHOLAT' : 'ISTIRAHAT';
    if (row.slotType === 'CEREMONY' || row.slotType === 'EXERCISE') {
      const label = row.name.trim() || (row.slotType === 'CEREMONY' ? 'UPACARA' : 'SENAM BERSAMA');
      return label.toLocaleUpperCase('id-ID');
    }
    return activeSchedules.filter((item) => item.classId === schoolClass.id && item.dayOfWeek === day && (item.timeSlotId && row.slotId ? item.timeSlotId === row.slotId : item.startsAt === row.startsAt && item.endsAt === row.endsAt)).map((item) => String(teacherCodes.get(item.teacherId) ?? '—')).join(' / ');
  };
  const rowCells = (day: number, row: MatrixRow): MatrixCell[] => {
    const values = activeClasses.map((schoolClass) => ({ value: cellValue(schoolClass, day, row), grade: schoolClass.grade ?? 'Lainnya' }));
    const result: MatrixCell[] = [];
    for (let index = 0; index < values.length;) {
      const current = values[index];
      const mergeable = row.slotType === 'BREAK' || row.slotType === 'RELIGIOUS' || row.slotType === 'CEREMONY' || row.slotType === 'EXERCISE';
      let end = index + 1;
      if (mergeable) while (end < values.length && values[end].value === current.value) end += 1;
      result.push({ value: current.value, grade: current.grade, activity: mergeable, colSpan: end - index });
      index = end;
    }
    return result;
  };
  const legendRows = Math.max(1, Math.ceil(sortedTeachers.length / 5));
  const legendMarkup = (className: string, style?: CSSProperties) => <div className={className} style={style}>{sortedTeachers.map((teacher) => <p key={teacher.id}>{teacherCodes.get(teacher.id)}. {teacher.name}</p>)}</div>;
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
          <thead>
            <tr><th className="w-7 border border-slate-600 p-[2px]" rowSpan={2}>Jam</th><th className="w-14 border border-slate-600 p-[2px]" rowSpan={2}>Waktu</th>{gradeGroups.map((group) => <th className="border border-slate-600 p-[2px]" colSpan={group.classes.length} key={group.grade}>Kelas {group.grade}</th>)}</tr>
            <tr>{activeClasses.map((schoolClass) => <th className="border border-slate-600 p-[2px] text-center align-middle" key={schoolClass.id}>{classLabel(schoolClass.name)}</th>)}</tr>
          </thead>
          <tbody>{day.rows.map((row, index) => <tr key={row.id}><td className="border border-slate-500 p-[2px] text-center">{row.periodNumber ?? index + 1}</td><td className="border border-slate-500 p-[2px] text-center">{formatTime(row.startsAt)}–{formatTime(row.endsAt)}</td>{rowCells(day.value, row).map((cell, cellIndex) => <td className={`border border-slate-500 p-[2px] text-center align-middle font-bold ${cell.activity ? 'bg-slate-100 dark:bg-slate-800' : gradeTone(cell.grade).cell}`} colSpan={cell.colSpan} key={`${row.id}-${cellIndex}`}>{cell.value}</td>)}</tr>)}</tbody>
        </table>
      </section>)}
      <section className="mt-2 border-t border-slate-700 pt-2">
        <h3 className="mb-1 text-[8px] font-black">KETERANGAN KODE GURU</h3>
        {legendMarkup('grid grid-flow-col grid-cols-5 gap-x-2 gap-y-[2px]', { gridTemplateRows: `repeat(${legendRows}, minmax(0, auto))` })}
        <p className="mt-1">ISTIRAHAT = Waktu istirahat · ISTIRAHAT/SHOLAT = Istirahat dan sholat berjamaah · UPACARA/SENAM BERSAMA = Kegiatan sekolah</p>
      </section>
    </div>,
  ];
  const excelDownload = () => {
    const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = rowsByDay.map((day) => `<h3>${day.label}</h3><table border="1"><tr><th rowspan="2">Jam</th><th rowspan="2">Waktu</th>${gradeGroups.map((group) => `<th colspan="${group.classes.length}">Kelas ${escape(group.grade)}</th>`).join('')}</tr><tr>${activeClasses.map((item) => `<th>${escape(classLabel(item.name))}</th>`).join('')}</tr>${day.rows.map((row, index) => `<tr><td>${row.periodNumber ?? index + 1}</td><td>${formatTime(row.startsAt)}-${formatTime(row.endsAt)}</td>${rowCells(day.value, row).map((cell) => `<td colspan="${cell.colSpan}" style="text-align:center;vertical-align:middle">${escape(cell.value)}</td>`).join('')}</tr>`).join('')}</table>`).join('');
    const legend = sortedTeachers.map((teacher) => `<li>${teacherCodes.get(teacher.id)}. ${escape(teacher.name)}</li>`).join('');
    const blob = new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body><h2>Jadwal Pelajaran Sekolah</h2><p>${escape(schoolYear?.name)} · ${escape(semester?.type === 'ODD' ? 'Semester Ganjil' : semester?.type === 'EVEN' ? 'Semester Genap' : 'Semester')}</p>${html}<h3>Keterangan Kode Guru</h3><ol>${legend}</ol></body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'jadwal-global-sekolah.xls'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] xl:col-span-2 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900 dark:text-[var(--text)]">Jadwal Global Sekolah</h2><p className="text-xs text-muted">Seluruh rombel dalam satu matriks, kode angka menunjukkan guru pengampu.</p></div><Button disabled={!activeClasses.length || !activeSchedules.length} onClick={() => setPreview(true)} size="sm">Preview &amp; Cetak</Button></div>
    {!activeClasses.length || !activeSchedules.length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-muted dark:bg-[var(--surface-soft)]">Belum ada jadwal untuk tahun ajaran dan semester yang dipilih.</p> : <div className="mt-4 overflow-x-auto"><p className="mb-2 text-xs text-muted">{activeClasses.length} rombel · {activeSchedules.length} jadwal · {days.length} hari</p><div className="min-w-[900px] space-y-4">{rowsByDay.map((day) => <div key={day.value}><h3 className="mb-1 text-sm font-black">{day.label}</h3><table className="w-full border-collapse text-[10px]"><thead><tr><th className="border p-1" rowSpan={2}>Jam</th><th className="border p-1" rowSpan={2}>Waktu</th>{gradeGroups.map((group) => <th className={`border p-1 ${gradeTone(group.grade).head}`} colSpan={group.classes.length} key={group.grade}>Kelas {group.grade}</th>)}</tr><tr>{activeClasses.map((item) => <th className={`border p-1 text-center ${gradeTone(item.grade ?? 'Lainnya').head}`} key={item.id}>{classLabel(item.name)}</th>)}</tr></thead><tbody>{day.rows.map((row, index) => <tr key={row.id}><td className="border p-1 text-center">{row.periodNumber ?? index + 1}</td><td className="border p-1 text-center">{formatTime(row.startsAt)}–{formatTime(row.endsAt)}</td>{rowCells(day.value, row).map((cell, cellIndex) => <td className={`border p-1 text-center align-middle ${cell.activity ? 'bg-slate-100 font-semibold dark:bg-slate-800' : gradeTone(cell.grade).cell}`} colSpan={cell.colSpan} key={`${row.id}-${cellIndex}`}>{cell.value}</td>)}</tr>)}</tbody></table></div>)}</div></div>}
    {preview ? <PrintPreview title="Jadwal Global Sekolah" pages={pages} paperSize="F4_LANDSCAPE" paperId="opsek-global-schedule" footerText="Jadwal global sekolah" onClose={() => setPreview(false)} onDownloadExcel={excelDownload} /> : null}
  </section>;
}
