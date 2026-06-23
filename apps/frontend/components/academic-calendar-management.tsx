'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type AcademicCalendarEvent, type AcademicCalendarEventType, type SchoolYear } from '../lib/api';
import { getUpcomingSchoolYear } from '../lib/school-year';
import { useToast } from './ui/toast';

const eventTypes: Array<{ value: AcademicCalendarEventType; label: string; blocksAgenda: boolean }> = [
  { value: 'HOLIDAY', label: 'Libur', blocksAgenda: true },
  { value: 'EXAM', label: 'Ujian / Asesmen', blocksAgenda: true },
  { value: 'SCHOOL_ACTIVITY', label: 'Kegiatan Sekolah', blocksAgenda: true },
  { value: 'NON_TEACHING_DAY', label: 'Hari Non-KBM', blocksAgenda: true },
  { value: 'OTHER', label: 'Lainnya', blocksAgenda: false },
];

function toDateInput(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarMonths(schoolYear?: SchoolYear) {
  if (!schoolYear) return [];
  const start = new Date(`${toDateInput(schoolYear.startsAt)}T00:00:00`);
  return Array.from({ length: 12 }, (_, index) => new Date(start.getFullYear(), start.getMonth() + index, 1));
}

const weekdayLabels = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

export function AcademicCalendarManagement() {
  const toast = useToast();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'HOLIDAY' as AcademicCalendarEventType,
    startsAt: '',
    endsAt: '',
    description: '',
    blocksAgenda: true,
  });

  const selectedSchoolYear = useMemo(
    () => schoolYears.find((year) => year.id === schoolYearId),
    [schoolYearId, schoolYears],
  );
  const calendarMonths = useMemo(() => getCalendarMonths(selectedSchoolYear), [selectedSchoolYear]);

  async function loadSchoolYears() {
    try {
      const response = await api.getSchoolYears();
      setSchoolYears(response.data);
      const preferred = getUpcomingSchoolYear(response.data);
      const nextId = schoolYearId || preferred?.id || response.data[0]?.id || '';
      setSchoolYearId(nextId);
    } catch {
      toast.error('Tahun ajaran gagal dimuat.', 'Kaldik');
    }
  }

  async function loadEvents(nextSchoolYearId: string) {
    if (!nextSchoolYearId) return;
    try {
      const response = await api.getAcademicCalendarEvents(nextSchoolYearId);
      setEvents(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Event Kaldik gagal dimuat.', 'Kaldik');
    }
  }

  useEffect(() => { void loadSchoolYears(); }, []);
  useEffect(() => { void loadEvents(schoolYearId); }, [schoolYearId]);

  useEffect(() => {
    if (!selectedSchoolYear || form.startsAt) return;
    const startsAt = toDateInput(selectedSchoolYear.startsAt);
    setForm((current) => ({ ...current, startsAt, endsAt: startsAt }));
  }, [form.startsAt, selectedSchoolYear]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolYearId || !form.title.trim() || !form.startsAt || !form.endsAt) {
      toast.warning('Lengkapi judul dan rentang tanggal event.', 'Kaldik');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.createAcademicCalendarEvent({
        schoolYearId,
        title: form.title.trim(),
        type: form.type,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        description: form.description.trim() || undefined,
        blocksAgenda: form.blocksAgenda,
      });
      setEvents((current) => [...current, response.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setForm((current) => ({ ...current, title: '', description: '' }));
      toast.success(response.message ?? 'Event Kaldik ditambahkan.', 'Kaldik');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Event Kaldik gagal ditambahkan.', 'Kaldik');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(event: AcademicCalendarEvent) {
    if (!window.confirm(`Hapus event Kaldik "${event.title}"?`)) return;
    try {
      const response = await api.deleteAcademicCalendarEvent(event.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      toast.success(response.message ?? 'Event Kaldik dihapus.', 'Kaldik');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Event Kaldik gagal dihapus.', 'Kaldik');
    }
  }

  function selectCalendarDate(date: Date) {
    const value = toIsoDate(date);
    setForm((current) => ({ ...current, startsAt: value, endsAt: value }));
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Master Kaldik</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Tandai Tanggal Penting</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Event yang memblokir agenda akan dilewati saat agenda harian dibuat.</p>

        <label className="mt-5 grid gap-1 text-sm font-semibold text-slate-700">
          Tahun ajaran
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setSchoolYearId(event.target.value)} value={schoolYearId}>
            {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </label>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Jenis event
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => {
              const type = event.target.value as AcademicCalendarEventType;
              setForm((current) => ({ ...current, type, blocksAgenda: eventTypes.find((item) => item.value === type)?.blocksAgenda ?? current.blocksAgenda }));
            }} value={form.type}>
              {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Judul event
            <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Libur Idulfitri" value={form.title} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Mulai
              <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} required type="date" value={form.startsAt} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Sampai
              <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} required type="date" value={form.endsAt} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Keterangan
            <textarea className="min-h-20 rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">
            <input checked={form.blocksAgenda} onChange={(event) => setForm((current) => ({ ...current, blocksAgenda: event.target.checked }))} type="checkbox" />
            Blokir pembuatan agenda pada rentang ini
          </label>
          <button className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300" disabled={isSaving} type="submit">Tambah Event Kaldik</button>
        </form>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">{selectedSchoolYear?.name ?? 'Tahun Ajaran'}</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Daftar Event Kaldik</h2>
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <article className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4" key={event.id}>
              <div className="min-w-0">
                <p className="font-black text-slate-900">{event.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{formatDate(event.startsAt)}{event.startsAt.slice(0, 10) !== event.endsAt.slice(0, 10) ? ` - ${formatDate(event.endsAt)}` : ''}</p>
                <p className="mt-1 text-xs font-bold text-brand-700">{eventTypes.find((item) => item.value === event.type)?.label} {event.blocksAgenda ? '· Blokir agenda' : '· Tidak memblokir agenda'}</p>
                {event.description ? <p className="mt-2 text-sm text-muted">{event.description}</p> : null}
              </div>
              <button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100" onClick={() => void handleDelete(event)} type="button">Hapus</button>
            </article>
          ))}
          {!events.length ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-muted">Belum ada event Kaldik pada tahun ajaran ini.</p> : null}
        </div>
      </section>

      <section className="xl:col-span-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Kalender Pendidikan</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Kaldik {selectedSchoolYear?.name ?? ''}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {calendarMonths.map((month) => {
            const monthStartDay = (month.getDay() + 6) % 7;
            const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
            const cells = Array.from({ length: monthStartDay + daysInMonth }, (_, index) => index - monthStartDay + 1);

            return (
              <article className="rounded-xl border border-slate-100 p-3" key={month.toISOString()}>
                <h3 className="text-sm font-black text-slate-900">
                  {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month)}
                </h3>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                  {weekdayLabels.map((label) => <span className="text-[10px] font-black text-slate-400" key={label}>{label}</span>)}
                  {cells.map((day, index) => {
                    if (day < 1) return <span key={`empty-${index}`} />;
                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                    const isoDate = toIsoDate(date);
                    const matchingEvent = events.find((event) => event.startsAt.slice(0, 10) <= isoDate && event.endsAt.slice(0, 10) >= isoDate);
                    const selected = form.startsAt === isoDate || form.endsAt === isoDate;

                    return (
                      <button
                        aria-label={`Pilih ${formatDate(isoDate)}`}
                        className={[
                          'relative grid aspect-square min-w-0 place-items-center rounded-lg text-xs font-bold transition',
                          matchingEvent?.blocksAgenda ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : '',
                          matchingEvent && !matchingEvent.blocksAgenda ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : '',
                          !matchingEvent ? 'text-slate-700 hover:bg-blue-50' : '',
                          selected ? 'ring-2 ring-brand-600 ring-offset-1' : '',
                        ].join(' ')}
                        key={isoDate}
                        onClick={() => selectCalendarDate(date)}
                        title={matchingEvent?.title}
                        type="button"
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
