'use client';

import { compareSchoolClasses } from '@eduflow/shared';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type Schedule } from '../lib/api';

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

type TeachingScheduleGroup = {
  className: string;
  endsAt: string;
  id: string;
  periodNumbers: number[];
  schedules: Schedule[];
  startsAt: string;
  subjectName: string;
};

function canMergeSchedule(previous: TeachingScheduleGroup, schedule: Schedule) {
  const lastSchedule = previous.schedules[previous.schedules.length - 1];
  const lastPeriod = previous.periodNumbers[previous.periodNumbers.length - 1];
  const nextPeriod = schedule.timeSlot?.periodNumber;

  return (
    lastSchedule.classId === schedule.classId &&
    lastSchedule.subjectId === schedule.subjectId &&
    (lastSchedule.room ?? '') === (schedule.room ?? '') &&
    typeof lastPeriod === 'number' &&
    typeof nextPeriod === 'number' &&
    nextPeriod === lastPeriod + 1
  );
}

function groupTeachingSchedules(schedules: Schedule[]): TeachingScheduleGroup[] {
  return schedules.reduce<TeachingScheduleGroup[]>((groups, schedule) => {
    const latestGroup = groups[groups.length - 1];

    if (latestGroup && canMergeSchedule(latestGroup, schedule)) {
      latestGroup.endsAt = schedule.endsAt;
      latestGroup.periodNumbers.push(schedule.timeSlot?.periodNumber as number);
      latestGroup.schedules.push(schedule);
      return groups;
    }

    groups.push({
      className: schedule.class.name,
      endsAt: schedule.endsAt,
      id: schedule.id,
      periodNumbers: schedule.timeSlot?.periodNumber ? [schedule.timeSlot.periodNumber] : [],
      schedules: [schedule],
      startsAt: schedule.startsAt,
      subjectName: schedule.subject.name,
    });

    return groups;
  }, []);
}

function getPeriodLabel(group: TeachingScheduleGroup) {
  return group.periodNumbers.length ? `Jam ke-${group.periodNumbers.join(', ')}` : 'Jam aktif';
}

function getCurrentDayOfWeek() {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
}

export function TeacherScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const currentDayOfWeek = useMemo(() => getCurrentDayOfWeek(), []);

  useEffect(() => {
    api
      .getMySchedules()
      .then((response) => {
        setSchedules(response.data);
        setState('success');
      })
      .catch(() => setState('error'));
  }, []);

  const schedulesByDay = useMemo(
    () =>
      days.map((label, index) => ({
        dayOfWeek: index + 1,
        label,
        groups: groupTeachingSchedules(
          [...schedules]
            .filter((schedule) => schedule.dayOfWeek === index + 1)
            .sort(
              (first, second) =>
                first.startsAt.localeCompare(second.startsAt) ||
                compareSchoolClasses(first.class, second.class),
            ),
        ),
      })),
    [schedules],
  );
  const activeDays = schedulesByDay.filter((day) => day.groups.length > 0);

  function exportExcel() {
    const rows = [['Hari', 'Jam Mulai', 'Jam Selesai', 'Jam Pelajaran', 'Mata Pelajaran', 'Kelas', 'Ruang']];
    for (const day of schedulesByDay) {
      for (const group of day.groups) {
        rows.push([day.label, group.startsAt, group.endsAt, getPeriodLabel(group), group.subjectName, group.className, group.schedules[0]?.room ?? '-']);
      }
    }
    const csv = '\\uFEFF' + rows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(';')).join('\\r\\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jadwal-mengajar.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = schedulesByDay.flatMap((day) => day.groups.map((group) =>
      '<tr><td>' + day.label + '</td><td>' + group.startsAt + '–' + group.endsAt + '</td><td>' + getPeriodLabel(group) + '</td><td>' + escapeHtml(group.subjectName) + '</td><td>' + escapeHtml(group.className) + '</td><td>' + escapeHtml(group.schedules[0]?.room ?? '-') + '</td></tr>',
    )).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.alert('Popup diblokir browser. Izinkan popup untuk mencetak jadwal ke PDF.');
      return;
    }
    printWindow.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Jadwal Mengajar</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:24px}h1{font-size:22px;margin-bottom:4px}p{color:#475569;font-size:12px;margin-top:0}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#eff6ff}tr{break-inside:avoid}@media print{body{padding:0}}</style></head><body><h1>Jadwal Mengajar</h1><p>EduFlow · Dicetak ' + new Date().toLocaleDateString('id-ID') + '</p><table><thead><tr><th>Hari</th><th>Waktu</th><th>Jam Pelajaran</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th></tr></thead><tbody>' + rows + '</tbody></table><script>window.onload=function(){window.print()}<\\/script></body></html>');
    printWindow.document.close();
  }

  if (state === 'loading') {
    return <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-brand-700">Memuat jadwal Anda...</p>;
  }

  if (state === 'error') {
    return <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Jadwal pribadi gagal dimuat. Pastikan akun login sudah terhubung ke data guru.</p>;
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 print:hidden">
        <p className="text-sm font-bold text-muted">Jadwal mengajar mingguan</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">{schedules.length} sesi</span>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-300 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]" onClick={exportExcel} type="button">Export Excel</button>
          <button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700" onClick={exportPdf} type="button">Export PDF</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {activeDays.map((day) => {
        const isToday = day.dayOfWeek === currentDayOfWeek;

        return (
          <details
            className={[
              'group rounded-[1.5rem] border p-3 shadow-sm transition sm:p-4',
              isToday
                ? 'border-brand-200 bg-blue-50/80 dark:border-blue-400/30 dark:bg-blue-400/10'
                : 'border-blue-100 bg-white dark:border-[var(--border)] dark:bg-[var(--surface-solid)]',
            ].join(' ')}
            key={day.dayOfWeek}
            open={isToday}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-1 py-1 transition hover:bg-blue-50/70 dark:hover:bg-blue-400/10">
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-[var(--text)]">{day.label}</span>
                {isToday ? (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-black text-white">
                    Hari ini
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-black text-muted">{day.groups.length} jadwal</span>
                <span
                  aria-hidden="true"
                  className="grid grid-cols-1 gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <ChevronUp className="size-3 text-slate-300 transition group-open:text-brand-700 dark:text-slate-600 dark:group-open:text-blue-100" strokeWidth={3} />
                  <ChevronDown className="size-3 text-brand-700 transition group-open:text-slate-300 dark:text-blue-100 dark:group-open:text-slate-600" strokeWidth={3} />
                </span>
              </span>
            </summary>
            <div className="mt-2 divide-y divide-slate-100">
              {day.groups.map((group) => (
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5" key={group.id}>
                  <div className="rounded-xl bg-brand-50 px-2 py-2 text-center">
                    <p className="text-[11px] font-black text-brand-700">{group.startsAt}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-muted">{group.endsAt}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{group.subjectName}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-muted">{group.className}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="max-w-24 truncate rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600"
                      title={group.className}
                    >
                      {group.className}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      {getPeriodLabel(group)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      {!activeDays.length ? (
        <p className="rounded-[1.5rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted sm:col-span-2 xl:col-span-3">Belum ada jadwal mengajar.</p>
      ) : null}
      </div>
    </section>
  );
}
