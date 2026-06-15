'use client';

import { compareSchoolClasses } from '@eduflow/shared';
import { useEffect, useMemo, useState } from 'react';
import { api, type Schedule } from '../lib/api';

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function TeacherScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

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
        schedules: [...schedules]
          .filter((schedule) => schedule.dayOfWeek === index + 1)
          .sort(
            (first, second) =>
              first.startsAt.localeCompare(second.startsAt) ||
              compareSchoolClasses(first.class, second.class),
          ),
      })),
    [schedules],
  );
  const activeDays = schedulesByDay.filter((day) => day.schedules.length > 0);

  if (state === 'loading') {
    return <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-brand-700">Memuat jadwal Anda...</p>;
  }

  if (state === 'error') {
    return <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Jadwal pribadi gagal dimuat. Pastikan akun login sudah terhubung ke data guru.</p>;
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold text-muted">Jadwal mengajar mingguan</p>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
          {schedules.length} sesi
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {activeDays.map((day) => (
        <article className="rounded-[1.5rem] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-100/60 sm:p-4" key={day.dayOfWeek}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-900">{day.label}</h2>
            <span className="text-[11px] font-black text-muted">{day.schedules.length} sesi</span>
          </div>
          <div className="mt-2 divide-y divide-slate-100">
            {day.schedules.map((schedule) => (
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5" key={schedule.id}>
                  <div className="rounded-xl bg-brand-50 px-2 py-2 text-center">
                    <p className="text-[11px] font-black text-brand-700">{schedule.startsAt}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-muted">{schedule.endsAt}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{schedule.subject.name}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-muted">{schedule.class.name}</p>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-500" title="Jadwal aktif" />
              </div>
            ))}
          </div>
        </article>
      ))}
      {!activeDays.length ? (
        <p className="rounded-[1.5rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted sm:col-span-2 xl:col-span-3">Belum ada jadwal mengajar.</p>
      ) : null}
      </div>
    </section>
  );
}
