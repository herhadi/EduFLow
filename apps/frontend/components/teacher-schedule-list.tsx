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

  if (state === 'loading') {
    return <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-brand-700">Memuat jadwal Anda...</p>;
  }

  if (state === 'error') {
    return <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Jadwal pribadi gagal dimuat. Pastikan akun login sudah terhubung ke data guru.</p>;
  }

  return (
    <section className="mt-6 space-y-4">
      {schedulesByDay.map((day) => (
        <article className="rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60" key={day.dayOfWeek}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">{day.label}</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">{day.schedules.length} sesi</span>
          </div>
          <div className="mt-3 space-y-2">
            {day.schedules.map((schedule) => (
              <div className="rounded-2xl bg-slate-50 p-4" key={schedule.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{schedule.subject.name}</p>
                    <p className="mt-1 text-sm font-semibold text-muted">{schedule.class.name}</p>
                  </div>
                  <p className="shrink-0 text-xs font-black text-brand-700">{schedule.startsAt}-{schedule.endsAt}</p>
                </div>
              </div>
            ))}
            {!day.schedules.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">Tidak ada jadwal.</p> : null}
          </div>
        </article>
      ))}
    </section>
  );
}
