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
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAssembly, setIsSavingAssembly] = useState(false);
  const [assemblyForm, setAssemblyForm] = useState({ enabled: false, startsAt: '06:50', endsAt: '07:10' });
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
  const selectedDateEvents = events.filter((event) => event.startsAt.slice(0, 10) <= selectedDate && event.endsAt.slice(0, 10) >= selectedDate);

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
    if (!selectedSchoolYear) return;
    setAssemblyForm({
      enabled: selectedSchoolYear.morningAssemblyEnabled ?? false,
      startsAt: selectedSchoolYear.morningAssemblyStartsAt ?? '06:50',
      endsAt: selectedSchoolYear.morningAssemblyEndsAt ?? '07:10',
    });
  }, [selectedSchoolYear]);

  useEffect(() => {
    if (!selectedSchoolYear || form.startsAt) return;
    const startsAt = toDateInput(selectedSchoolYear.startsAt);
    setForm((current) => ({ ...current, startsAt, endsAt: startsAt }));
  }, [form.startsAt, selectedSchoolYear]);

  async function saveMorningAssembly(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolYearId) return;
    setIsSavingAssembly(true);
    try {
      const response = await api.updateMorningAssemblySettings(schoolYearId, assemblyForm);
      setSchoolYears((current) => current.map((year) => year.id === schoolYearId ? response.data : year));
      toast.success(response.message ?? 'Pengaturan apel pagi disimpan.', 'Apel Pagi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pengaturan apel pagi gagal disimpan.', 'Apel Pagi');
    } finally { setIsSavingAssembly(false); }
  }

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
        blocksAgenda: /upacara/i.test(form.title) ? false : form.blocksAgenda,
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
    setSelectedDate(value);
    setForm((current) => ({ ...current, startsAt: value, endsAt: value }));
  }

  function goToToday() {
    selectCalendarDate(new Date());
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Master Kaldik</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Tandai Tanggal Penting</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Event yang memblokir agenda akan dilewati saat agenda harian dibuat.</p>

        <label className="mt-5 grid gap-1 text-sm font-semibold text-slate-700">
          Tahun ajaran
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-brand-600" onChange={(event) => setSchoolYearId(event.target.value)} value={schoolYearId}>
            {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </label>

        <form className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4" onSubmit={saveMorningAssembly}>
          <div><h3 className="font-black text-sky-950">Apel Pagi</h3><p className="mt-1 text-xs leading-5 text-sky-900">Jika aktif, seluruh jam pelajaran pada tanggal tanpa upacara digeser sesuai durasi apel.</p></div>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-800"><input checked={assemblyForm.enabled} onChange={(event) => setAssemblyForm((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" /> Aktifkan apel pagi</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Mulai<input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal" disabled={!assemblyForm.enabled} onChange={(event) => setAssemblyForm((current) => ({ ...current, startsAt: event.target.value }))} required type="time" value={assemblyForm.startsAt} /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Selesai<input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal" disabled={!assemblyForm.enabled} onChange={(event) => setAssemblyForm((current) => ({ ...current, endsAt: event.target.value }))} required type="time" value={assemblyForm.endsAt} /></label>
          </div>
          <button className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-black text-sky-900 disabled:opacity-50" disabled={isSavingAssembly || !schoolYearId} type="submit">{isSavingAssembly ? 'Menyimpan...' : 'Simpan Pengaturan Apel'}</button>
        </form>

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
          {!/upacara/i.test(form.title) ? <label className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">
            <input checked={form.blocksAgenda} onChange={(event) => setForm((current) => ({ ...current, blocksAgenda: event.target.checked }))} type="checkbox" />
            Blokir pembuatan agenda pada rentang ini
          </label> : <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-3 text-sm text-sky-900">Upacara menerapkan pergeseran jadwal otomatis untuk minggu ini.</p>}
          <button className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300" disabled={isSaving} type="submit">Tambah Event Kaldik</button>
        </form>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">{selectedSchoolYear?.name ?? 'Tahun Ajaran'}</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Daftar Event Kaldik</h2>
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <article className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4" key={event.id}>
              <div className="min-w-0">
                <p className="font-black text-slate-900">{event.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{formatDate(event.startsAt)}{event.startsAt.slice(0, 10) !== event.endsAt.slice(0, 10) ? ` - ${formatDate(event.endsAt)}` : ''}</p>
                <p className="mt-1 text-xs font-bold text-brand-700">{eventTypes.find((item) => item.value === event.type)?.label} {/upacara/i.test(event.title) ? '· Pergeseran otomatis minggu upacara' : event.blocksAgenda ? '· Blokir agenda' : '· Tidak memblokir agenda'}</p>
                {event.description ? <p className="mt-2 text-sm text-muted">{event.description}</p> : null}
              </div>
              <button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100" onClick={() => void handleDelete(event)} type="button">Hapus</button>
            </article>
          ))}
          {!events.length ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-muted">Belum ada event Kaldik pada tahun ajaran ini.</p> : null}
        </div>
      </section>

      <section className="xl:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">Kalender Akademik</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Kalender Pendidikan</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">Libur, ujian, dan kegiatan penting dalam satu tampilan.</p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">{selectedSchoolYear?.name ?? 'Pilih tahun ajaran'}</span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Tahun ajaran penuh</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {calendarMonths.length ? `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(calendarMonths[0])} – ${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(calendarMonths[calendarMonths.length - 1])}` : 'Kalender belum tersedia'}
              </h3>
            </div>
            <button className="self-start rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={goToToday} type="button">Pilih hari ini</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {eventTypes.map((item) => (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600" key={item.value}>
                <span className={`h-2.5 w-2.5 rounded-full ${item.value === 'HOLIDAY' ? 'bg-rose-500' : item.value === 'EXAM' ? 'bg-violet-500' : item.value === 'SCHOOL_ACTIVITY' ? 'bg-sky-500' : item.value === 'NON_TEACHING_DAY' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {calendarMonths.map((month) => {
              const monthStartDay = (month.getDay() + 6) % 7;
              const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
              const cells = Array.from({ length: Math.ceil((monthStartDay + daysInMonth) / 7) * 7 }, (_, index) => index - monthStartDay + 1);
              const monthEvents = events.filter((event) => {
                const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                return event.startsAt.slice(0, 7) <= monthKey && event.endsAt.slice(0, 7) >= monthKey;
              });
              return (
                <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4" key={month.toISOString()}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black capitalize text-slate-900 sm:text-lg">{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month)}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{monthEvents.length} agenda</span>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                    {weekdayLabels.map((label) => <span className="pb-1 text-[10px] font-black text-slate-400 sm:text-xs" key={label}>{label}</span>)}
                    {cells.map((day, index) => {
                      if (day < 1 || day > daysInMonth) return <span aria-hidden="true" className="aspect-square" key={`empty-${index}`} />;
                      const date = new Date(month.getFullYear(), month.getMonth(), day);
                      const isoDate = toIsoDate(date);
                      const matchingEvents = events.filter((event) => event.startsAt.slice(0, 10) <= isoDate && event.endsAt.slice(0, 10) >= isoDate);
                      const selected = selectedDate === isoDate;
                      const today = toIsoDate(new Date()) === isoDate;
                      const holiday = matchingEvents.some((event) => event.type === 'HOLIDAY' || event.type === 'NON_TEACHING_DAY');
                      return (
                        <button
                          aria-label={`Pilih ${formatDate(isoDate)}`}
                          aria-pressed={selected}
                          className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border text-xs font-bold transition sm:text-sm ${selected ? 'border-brand-600 bg-brand-600 text-white shadow-md' : today ? 'border-brand-300 bg-blue-50 text-brand-700' : holiday ? 'border-rose-100 bg-rose-50 text-rose-800 hover:bg-rose-100' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}
                          key={isoDate}
                          onClick={() => selectCalendarDate(date)}
                          title={matchingEvents.map((event) => event.title).join(' • ') || formatDate(isoDate)}
                          type="button"
                        >
                          <span>{day}</span>
                          <span className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                            {matchingEvents.slice(0, 3).map((event) => <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : event.type === 'HOLIDAY' ? 'bg-rose-500' : event.type === 'EXAM' ? 'bg-violet-500' : event.type === 'SCHOOL_ACTIVITY' ? 'bg-sky-500' : event.type === 'NON_TEACHING_DAY' ? 'bg-amber-500' : 'bg-emerald-500'}`} key={event.id} />)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {monthEvents.length ? <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {monthEvents.slice(0, 3).map((event) => (
                      <button className="flex w-full min-w-0 items-center gap-2 text-left" key={event.id} onClick={() => selectCalendarDate(new Date(`${event.startsAt.slice(0, 10)}T00:00:00`))} type="button">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${event.type === 'HOLIDAY' ? 'bg-rose-500' : event.type === 'EXAM' ? 'bg-violet-500' : event.type === 'SCHOOL_ACTIVITY' ? 'bg-sky-500' : event.type === 'NON_TEACHING_DAY' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{event.title}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">{event.startsAt.slice(8, 10)}</span>
                      </button>
                    ))}
                    {monthEvents.length > 3 ? <p className="pl-4 text-[10px] font-semibold text-slate-400">+{monthEvents.length - 3} agenda lainnya</p> : null}
                  </div> : <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Belum ada agenda bulan ini.</p>}
                </article>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Tanggal terpilih</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">{formatDate(selectedDate)}</h3>
            {selectedDateEvents.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedDateEvents.map((event) => (
                <article className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-white bg-white p-3" key={event.id}>
                  <div className="min-w-0"><p className="break-words text-sm font-black text-slate-900">{event.title}</p><p className="mt-1 text-xs text-slate-500">{eventTypes.find((item) => item.value === event.type)?.label}</p>{event.description ? <p className="mt-1 text-xs text-slate-500">{event.description}</p> : null}</div>
                  <button className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100" onClick={() => void handleDelete(event)} type="button">Hapus</button>
                </article>
              ))}
            </div> : <p className="mt-2 text-sm text-slate-600">Belum ada agenda pada tanggal ini. Pilih tanggal untuk mengisi tanggal kegiatan di formulir.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
