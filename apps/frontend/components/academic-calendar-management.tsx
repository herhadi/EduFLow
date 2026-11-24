'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type AcademicCalendarEvent, type AcademicCalendarEventType, type SchoolYear } from '../lib/api';
import { getUpcomingSchoolYear } from '../lib/school-year';
import { useToast } from './ui/toast';
import { formatSchoolDate, getSchoolDateKey } from '../lib/school-time';

const eventTypes: Array<{ value: AcademicCalendarEventType; label: string; blocksAgenda: boolean; color: string; dot: string }> = [
  { value: 'HOLIDAY', label: 'Libur', blocksAgenda: true, color: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200', dot: 'bg-rose-500' },
  { value: 'EXAM', label: 'Ujian / Asesmen', blocksAgenda: true, color: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200', dot: 'bg-violet-500' },
  { value: 'SCHOOL_ACTIVITY', label: 'Kegiatan Sekolah', blocksAgenda: true, color: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200', dot: 'bg-sky-500' },
  { value: 'NATIONAL_CEREMONY', label: 'Upacara Hari Nasional', blocksAgenda: false, color: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200', dot: 'bg-emerald-500' },
  { value: 'NON_TEACHING_DAY', label: 'Hari Non-KBM', blocksAgenda: true, color: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200', dot: 'bg-amber-500' },
  { value: 'OTHER', label: 'Lainnya', blocksAgenda: false, color: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200', dot: 'bg-slate-500' },
];
type DateMode = 'single' | 'range' | 'multiple';
const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const labelClass = 'grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200';

function dateInput(value: string) { return getSchoolDateKey(value); }
function isoDate(date: Date) { return getSchoolDateKey(date); }

function formatDate(value: string) {
  return formatSchoolDate(value.slice(0, 10));
}
function formatMonth(date: Date) { return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date); }
function getCalendarMonths(schoolYear?: SchoolYear) {
  if (!schoolYear) return [];
  // Nama tahun ajaran menjadi acuan utama agar data startsAt lama/tidak konsisten
  // tidak membuat tahun ajaran 2026/2027 tampil mulai Juli 2025.
  const match = schoolYear.name.match(/(\d{4})\s*[/-]\s*(\d{4})/);
  const startsKey = getSchoolDateKey(schoolYear.startsAt);
  const [startsYear, startsMonth] = startsKey.split('-').map(Number);
  const firstYear = match ? Number(match[1]) : startsMonth >= 7 ? startsYear : startsYear - 1;
  return Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(firstYear, 6 + index, 1, 12)));
}
function blankForm(date: string) {
  return { title: '', type: 'HOLIDAY' as AcademicCalendarEventType, startsAt: date, endsAt: date, description: '', blocksAgenda: true };
}

export function AcademicCalendarManagement() {
  const toast = useToast();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [monthIndex, setMonthIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [multipleDates, setMultipleDates] = useState<string[]>([isoDate(new Date())]);
  const [editingEvent, setEditingEvent] = useState<AcademicCalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAssembly, setSavingAssembly] = useState(false);
  const [assembly, setAssembly] = useState({ enabled: false, startsAt: '06:50', endsAt: '07:10' });
  const [form, setForm] = useState(blankForm(isoDate(new Date())));

  const selectedSchoolYear = useMemo(() => schoolYears.find((year) => year.id === schoolYearId), [schoolYears, schoolYearId]);
  const months = useMemo(() => getCalendarMonths(selectedSchoolYear), [selectedSchoolYear]);
  const activeMonth = months[monthIndex];
  const selectedEvents = events.filter((item) => item.startsAt.slice(0, 10) <= selectedDate && item.endsAt.slice(0, 10) >= selectedDate);

  async function loadYears() {
    try {
      const response = await api.getSchoolYears();
      setSchoolYears(response.data);
      setSchoolYearId((current) => current || getUpcomingSchoolYear(response.data)?.id || response.data[0]?.id || '');
    } catch { toast.error('Tahun ajaran gagal dimuat.', 'Kaldik'); }
  }
  async function loadEvents(id: string) {
    if (!id) return;
    try { const response = await api.getAcademicCalendarEvents(id); setEvents(response.data); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Kegiatan Kaldik gagal dimuat.', 'Kaldik'); }
  }
  useEffect(() => { void loadYears(); }, []);
  useEffect(() => { void loadEvents(schoolYearId); }, [schoolYearId]);
  useEffect(() => {
    if (!selectedSchoolYear) return;
    setAssembly({
      enabled: selectedSchoolYear.morningAssemblyEnabled ?? false,
      startsAt: selectedSchoolYear.morningAssemblyStartsAt ?? '06:50',
      endsAt: selectedSchoolYear.morningAssemblyEndsAt ?? '07:10',
    });
    const allMonths = getCalendarMonths(selectedSchoolYear);
    const today = new Date();
    const todayMonth = getSchoolDateKey(today).slice(0, 7);
    const todayIndex = allMonths.findIndex((month) => getSchoolDateKey(month).slice(0, 7) === todayMonth);
    setMonthIndex(todayIndex >= 0 ? todayIndex : 0);
    setSelectedDate(todayIndex >= 0 ? isoDate(today) : isoDate(allMonths[0] || today));
  }, [selectedSchoolYear]);

  async function saveAssembly(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolYearId) return;
    setSavingAssembly(true);
    try {
      const response = await api.updateMorningAssemblySettings(schoolYearId, assembly);
      setSchoolYears((current) => current.map((year) => year.id === schoolYearId ? response.data : year));
      toast.success(response.message ?? 'Pengaturan apel pagi disimpan.', 'Apel Pagi');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Pengaturan apel pagi gagal disimpan.', 'Apel Pagi'); }
    finally { setSavingAssembly(false); }
  }

  function openCreate(date: string) {
    setSelectedDate(date);
    setEditingEvent(null);
    setDateMode('single');
    setMultipleDates([date]);
    setForm(blankForm(date));
    setDialogOpen(true);
  }
  function openEdit(item: AcademicCalendarEvent) {
    setSelectedDate(item.startsAt.slice(0, 10));
    setEditingEvent(item);
    setDateMode(item.startsAt.slice(0, 10) === item.endsAt.slice(0, 10) ? 'single' : 'range');
    setMultipleDates([item.startsAt.slice(0, 10)]);
    setForm({ title: item.title, type: item.type, startsAt: item.startsAt.slice(0, 10), endsAt: item.endsAt.slice(0, 10), description: item.description ?? '', blocksAgenda: item.blocksAgenda });
    setDialogOpen(true);
  }
  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolYearId || !form.title.trim() || !form.startsAt || (dateMode === 'range' && !form.endsAt) || (dateMode === 'multiple' && !multipleDates.some(Boolean))) {
      toast.warning('Lengkapi nama kegiatan dan tanggal pelaksanaan.', 'Kaldik'); return;
    }
    if (dateMode === 'range' && form.endsAt < form.startsAt) {
      toast.warning('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.', 'Kaldik'); return;
    }
    setSaving(true);
    try {
      const common = { schoolYearId, title: form.title.trim(), type: form.type, description: form.description.trim() || undefined, blocksAgenda: form.type === 'NATIONAL_CEREMONY' ? false : form.blocksAgenda };
      if (editingEvent) {
        const response = await api.updateAcademicCalendarEvent(editingEvent.id, { title: common.title, type: common.type, description: common.description, blocksAgenda: common.blocksAgenda, startsAt: form.startsAt, endsAt: dateMode === 'single' ? form.startsAt : form.endsAt });
        setEvents((current) => current.map((item) => item.id === editingEvent.id ? response.data : item).sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        toast.success(response.message ?? 'Kegiatan Kaldik diperbarui.', 'Kaldik');
      } else if (dateMode === 'multiple') {
        const dates = [...new Set(multipleDates.filter(Boolean))].sort();
        const created: AcademicCalendarEvent[] = [];
        for (const date of dates) {
          const response = await api.createAcademicCalendarEvent({ ...common, startsAt: date, endsAt: date });
          created.push(response.data);
        }
        setEvents((current) => [...current, ...created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        toast.success(String(created.length) + ' tanggal kegiatan berhasil disimpan.', 'Kaldik');
      } else {
        const response = await api.createAcademicCalendarEvent({ ...common, startsAt: form.startsAt, endsAt: dateMode === 'single' ? form.startsAt : form.endsAt });
        setEvents((current) => [...current, response.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        toast.success(response.message ?? 'Kegiatan Kaldik ditambahkan.', 'Kaldik');
      }
      setDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kegiatan Kaldik gagal disimpan.', 'Kaldik');
      void loadEvents(schoolYearId);
    } finally { setSaving(false); }
  }
  async function deleteActivity(item: AcademicCalendarEvent) {
    if (!window.confirm('Hapus kegiatan Kaldik "' + item.title + '"?')) return;
    setDialogOpen(false);
    try {
      const response = await api.deleteAcademicCalendarEvent(item.id);
      setEvents((current) => current.filter((entry) => entry.id !== item.id));
      toast.success(response.message ?? 'Kegiatan Kaldik dihapus.', 'Kaldik');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Kegiatan Kaldik gagal dihapus.', 'Kaldik'); }
  }
  function todayAction() {
    const today = new Date();
    const todayMonth = getSchoolDateKey(today).slice(0, 7);
    const index = months.findIndex((month) => getSchoolDateKey(month).slice(0, 7) === todayMonth);
    if (index < 0) { toast.warning('Hari ini berada di luar rentang tahun ajaran yang dipilih.', 'Kaldik'); return; }
    setMonthIndex(index); setSelectedDate(isoDate(today));
  }

  const offset = activeMonth ? new Date(Date.UTC(activeMonth.getUTCFullYear(), activeMonth.getUTCMonth(), 1, 12)).getUTCDay() : 0;
  const days = activeMonth ? new Date(Date.UTC(activeMonth.getUTCFullYear(), activeMonth.getUTCMonth() + 1, 0, 12)).getUTCDate() : 0;
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1);

  return <div className="mt-6 space-y-5">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">Master Kaldik</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Kalender Pendidikan</h2><p className="mt-2 text-sm leading-6 text-blue-100">Klik tanggal untuk menambah kegiatan. Rentang tanggal memudahkan input libur beberapa hari.</p></div>
          <button className="rounded-xl !bg-white px-4 py-2.5 text-sm font-black !text-slate-950 shadow-sm transition hover:!bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950 dark:!bg-white dark:!text-slate-950 dark:hover:!bg-sky-100" disabled={!selectedDate} onClick={() => openCreate(selectedDate)} type="button">+ Tambah Kegiatan</button>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="grid max-w-sm gap-1 text-sm font-semibold text-blue-100">Tahun ajaran<select className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none" onChange={(event) => setSchoolYearId(event.target.value)} value={schoolYearId}>{schoolYears.map((year) => <option className="bg-slate-900 text-white" key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">{selectedSchoolYear?.name ?? 'Pilih tahun ajaran'} · Juli–Juni</span>
        </div>
      </header>
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-sky-600 px-4 py-4 text-white shadow-sm sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Kalender Akademik & Nasional</p><h3 className="mt-1 text-xl font-black capitalize sm:text-2xl">{activeMonth ? formatMonth(activeMonth) : 'Kalender belum tersedia'}</h3><p className="mt-1 text-[11px] font-medium text-blue-100">Bulan {monthIndex + 1} dari 12 · {selectedSchoolYear?.name ?? 'Tahun ajaran'}</p></div>
              <div className="flex items-center gap-1.5">
                <button aria-label="Bulan sebelumnya" className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/15 text-xl font-bold text-white transition hover:bg-white/25 disabled:opacity-35" disabled={monthIndex === 0} onClick={() => setMonthIndex((value) => Math.max(0, value - 1))} type="button">‹</button>
                <button className="rounded-xl border border-white/10 bg-white/15 px-3 py-2 text-xs font-black text-white transition hover:bg-white/25" onClick={todayAction} type="button">Hari ini</button>
                <button aria-label="Bulan berikutnya" className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/15 text-xl font-bold text-white transition hover:bg-white/25 disabled:opacity-35" disabled={monthIndex === 11} onClick={() => setMonthIndex((value) => Math.min(11, value + 1))} type="button">›</button>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekdays.map((label, weekdayIndex) => <span className={'py-2 text-center text-[10px] font-black sm:text-xs ' + (weekdayIndex === 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400')} key={label}>{label}</span>)}
            {cells.map((day, index) => {
              if (!activeMonth || day < 1 || day > days) return <span aria-hidden="true" className="calendar-day-cell min-h-0" key={'empty-' + index} />;
              const date = isoDate(new Date(Date.UTC(activeMonth.getUTCFullYear(), activeMonth.getUTCMonth(), day, 12)));
              const matches = events.filter((item) => item.startsAt.slice(0, 10) <= date && item.endsAt.slice(0, 10) >= date);
              const selected = date === selectedDate;
              const today = date === isoDate(new Date());
              const holiday = matches.some((item) => item.type === 'HOLIDAY');
              return <button aria-label={'Tambah kegiatan pada ' + formatDate(date)} aria-pressed={selected} className={'flex calendar-day-cell min-h-0 min-w-0 flex-col items-center justify-center rounded-xl border p-1.5 text-center transition sm:p-2 ' + (selected ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-600 dark:bg-sky-950/45 dark:ring-sky-900' : (index % 7 === 0 || holiday) ? 'border-rose-100 bg-rose-50/70 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/25 dark:hover:bg-rose-950/45' : 'border-slate-100 bg-white hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800') + (today && !selected ? ' border-sky-500 ring-2 ring-sky-200 dark:border-sky-500 dark:ring-sky-900' : '')} key={date} onClick={() => openCreate(date)} title={matches.map((item) => item.title).join(' • ') || 'Tambah kegiatan ' + formatDate(date)} type="button">
                <span className={'w-full text-center text-xs font-extrabold sm:text-sm ' + (today ? 'text-sky-700 dark:text-sky-300' : (index % 7 === 0 || holiday) ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100')}>{day}</span>
                <span className="mt-1 flex flex-wrap gap-1">{matches.slice(0, 4).map((item) => <span className={'h-1.5 w-1.5 rounded-full ' + (eventTypes.find((type) => type.value === item.type)?.dot ?? 'bg-slate-400')} key={item.id} />)}</span>
              </button>;
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Titik berwarna menandakan sudah ada kegiatan. Klik tanggal untuk menambahkan kegiatan baru.</p>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="font-black text-slate-900 dark:text-slate-100">{selectedDate ? 'Kegiatan pada ' + formatDate(selectedDate) : 'Pilih tanggal'}</h3>
            <div className="mt-3 space-y-2">{selectedEvents.map((item) => {
              const type = eventTypes.find((entry) => entry.value === item.type) ?? eventTypes[eventTypes.length - 1];
              return <button className={'block w-full rounded-xl border p-3 text-left ' + type.color} key={item.id} onClick={() => openEdit(item)} type="button"><span className="block break-words text-sm font-black">{item.title}</span><span className="mt-1 block text-xs">{type.label}{item.startsAt.slice(0, 10) !== item.endsAt.slice(0, 10) ? ' · ' + item.startsAt.slice(0, 10) + ' – ' + item.endsAt.slice(0, 10) : ''}</span><span className="mt-2 block text-[11px] font-bold underline">Klik untuk mengedit</span></button>;
            })}{!selectedEvents.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">{selectedDate ? 'Belum ada kegiatan pada tanggal ini.' : 'Pilih tanggal pada kalender untuk melihat atau menambahkan kegiatan.'}</p>}</div>
            <button className="mt-3 w-full rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-black text-white hover:bg-brand-700" disabled={!selectedDate} onClick={() => openCreate(selectedDate)} type="button">+ Tambah di tanggal ini</button>
          </section>
          <form className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-slate-700 dark:bg-slate-800" onSubmit={saveAssembly}>
            <div><h3 className="font-black text-sky-950 dark:text-sky-100">Apel Pagi</h3><p className="mt-1 text-xs leading-5 text-sky-900 dark:text-slate-300">Jam pelajaran pada tanggal tanpa upacara digeser sesuai durasi apel.</p></div>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200"><input checked={assembly.enabled} onChange={(event) => setAssembly((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" />Aktifkan apel pagi</label>
            <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Mulai<input className={inputClass} disabled={!assembly.enabled} onChange={(event) => setAssembly((current) => ({ ...current, startsAt: event.target.value }))} required type="time" value={assembly.startsAt} /></label><label className={labelClass}>Selesai<input className={inputClass} disabled={!assembly.enabled} onChange={(event) => setAssembly((current) => ({ ...current, endsAt: event.target.value }))} required type="time" value={assembly.endsAt} /></label></div>
            <button className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-black text-sky-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-sky-200" disabled={savingAssembly || !schoolYearId} type="submit">{savingAssembly ? 'Menyimpan...' : 'Simpan Pengaturan Apel'}</button>
          </form>
        </aside>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-slate-50 via-white to-sky-50 px-4 py-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Tinjauan Tahunan</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">Kalender Pendidikan · 1 Tahun</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan 12 bulan tahun ajaran Juli–Juni. Pilih bulan untuk membuka kalender detail.</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedSchoolYear?.name ?? 'Tahun ajaran'}</span>
      </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-4">
        {months.map((month, index) => {
          const monthStart = isoDate(month);
          const monthEnd = isoDate(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 12)));
          const monthDays = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 12)).getUTCDate();
          const monthOffset = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 12)).getUTCDay();
          // Keep every annual mini-calendar at exactly six rows so all month cards align.
          const monthCells = Array.from({ length: 42 }, (_, cell) => cell - monthOffset + 1);
          const monthEventCount = events.filter((item) => item.startsAt.slice(0, 10) <= monthEnd && item.endsAt.slice(0, 10) >= monthStart).length;
          return <button aria-label={'Buka kalender ' + formatMonth(month)} aria-pressed={index === monthIndex} className={'min-w-0 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ' + (index === monthIndex ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-600 dark:bg-sky-950/40 dark:ring-sky-900' : 'border-slate-200 bg-white hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500')} key={monthStart} onClick={() => { setMonthIndex(index); setSelectedDate(''); }} type="button">
            <span className="flex items-start justify-between gap-1"><span className="truncate text-sm font-black capitalize text-slate-900 dark:text-slate-100">{formatMonth(month)}</span><span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{monthEventCount}</span></span>
            <span className="mt-2 grid grid-cols-7 gap-y-1 text-center">
              {weekdays.map((day, weekdayIndex) => <span className={'text-[9px] font-bold ' + (weekdayIndex === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500')} key={day}>{day.slice(0, 1)}</span>)}
              {monthCells.map((day, cellIndex) => {
                if (day < 1 || day > monthDays) return <span className="aspect-square w-full" key={'blank-' + cellIndex} />;
                const date = isoDate(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 12)));
                const isToday = date === isoDate(new Date());
                const dayEvents = events.filter((item) => item.startsAt.slice(0, 10) <= date && item.endsAt.slice(0, 10) >= date);
                const hasActivity = dayEvents.length > 0;
                const isHoliday = dayEvents.some((item) => item.type === 'HOLIDAY');
                return <span className={'flex aspect-square w-full items-center justify-center rounded text-[9px] ' + (date === selectedDate ? 'bg-sky-600 font-extrabold text-white' : isToday ? 'bg-amber-100 font-extrabold text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/60 dark:text-amber-100 dark:ring-amber-700' : isHoliday ? 'bg-rose-100 font-bold text-rose-700 dark:bg-rose-900/50 dark:text-rose-200' : hasActivity ? 'bg-sky-100 font-bold text-sky-800 dark:bg-sky-900 dark:text-sky-100' : cellIndex % 7 === 0 ? 'text-rose-500 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300')} key={date}>{day}</span>;
              })}
            </span>
          </button>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">{selectedSchoolYear?.name ?? 'Tahun Ajaran'}</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">Daftar Kegiatan Kaldik</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{events.length} kegiatan</span></div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{events.map((item) => {
        const type = eventTypes.find((entry) => entry.value === item.type) ?? eventTypes[eventTypes.length - 1];
        return <article className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800" key={item.id}><span className={'h-2 w-2 shrink-0 rounded-full ' + type.dot} /><button className="min-w-0 flex-1 text-left" onClick={() => openEdit(item)} type="button"><span className="block break-words text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</span><span className="mt-0.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatDate(item.startsAt)}{item.startsAt.slice(0, 10) !== item.endsAt.slice(0, 10) ? ' – ' + formatDate(item.endsAt) : ''}</span><span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">{type.label}</span></button><button aria-label={'Hapus kegiatan ' + item.title} className="rounded-md border border-red-700 bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500" onClick={() => void deleteActivity(item)} type="button">Hapus</button></article>;
      })}{!events.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Belum ada kegiatan Kaldik pada tahun ajaran ini.</p>}</div>
    </section>

    {dialogOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
      <section aria-labelledby="kaldik-dialog-title" aria-modal="true" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-6" role="dialog">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Kaldik · {selectedSchoolYear?.name}</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100" id="kaldik-dialog-title">{editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{editingEvent ? 'Perbarui detail kegiatan yang dipilih.' : 'Tanggal pilihan: ' + formatDate(form.startsAt)}</p></div><button aria-label="Tutup dialog" className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-200" onClick={() => setDialogOpen(false)} type="button">✕</button></div>
        <form className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={submitActivity}>
          <label className={labelClass}>Jenis kegiatan<select className={inputClass} onChange={(event) => { const type = event.target.value as AcademicCalendarEventType; setForm((current) => ({ ...current, type, blocksAgenda: eventTypes.find((item) => item.value === type)?.blocksAgenda ?? current.blocksAgenda })); }} value={form.type}>{eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className={labelClass}>Nama kegiatan<input autoFocus className={inputClass} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Hari Pahlawan atau Libur Idulfitri" required value={form.title} /></label>
          {!editingEvent && <fieldset className="grid gap-2 sm:col-span-2"><legend className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Pola tanggal</legend><div className="grid grid-cols-3 gap-2">{([{ value: 'single', label: 'Satu hari' }, { value: 'range', label: 'Rentang' }, { value: 'multiple', label: 'Beberapa tanggal' }] as const).map((item) => <button className={'rounded-xl border px-2 py-2.5 text-xs font-bold sm:text-sm ' + (dateMode === item.value ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-sky-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')} key={item.value} onClick={() => { setDateMode(item.value); if (item.value === 'single') setForm((current) => ({ ...current, endsAt: current.startsAt })); if (item.value === 'multiple') setMultipleDates((current) => current.length ? current : [form.startsAt]); }} type="button">{item.label}</button>)}</div></fieldset>}
          {dateMode === 'multiple' && !editingEvent ? <div className="grid gap-2 sm:col-span-2"><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Setiap tanggal disimpan sebagai kegiatan satu hari dengan nama yang sama.</p>{multipleDates.map((date, index) => <div className="flex items-center gap-2" key={'date-' + index}><input aria-label={'Tanggal pilihan ' + (index + 1)} className={inputClass} onChange={(event) => setMultipleDates((current) => current.map((value, i) => i === index ? event.target.value : value))} required type="date" value={date} /><button aria-label="Hapus tanggal pilihan" className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500" disabled={multipleDates.length === 1} onClick={() => { if (window.confirm('Hapus tanggal ' + formatDate(date) + ' dari daftar pilihan?')) setMultipleDates((current) => current.filter((_, i) => i !== index)); }} type="button">−</button></div>)}<button className="justify-self-start rounded-lg border border-dashed border-brand-300 px-3 py-2 text-xs font-bold text-brand-700 dark:border-slate-600 dark:text-sky-200" onClick={() => setMultipleDates((current) => [...current, current[current.length - 1] || form.startsAt])} type="button">+ Tambah tanggal</button></div> : <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><label className={labelClass}>{dateMode === 'single' ? 'Tanggal' : 'Mulai'}<input className={inputClass} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value, endsAt: dateMode === 'single' ? event.target.value : current.endsAt }))} required type="date" value={form.startsAt} /></label>{dateMode === 'range' && <label className={labelClass}>Sampai<input className={inputClass} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} required type="date" value={form.endsAt} /></label>}</div>}
          <label className={labelClass + ' sm:col-span-2'}>Keterangan<textarea className={inputClass + ' min-h-20 resize-y'} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
          {form.type !== 'NATIONAL_CEREMONY' ? <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2"><input checked={form.blocksAgenda} className="mt-0.5" onChange={(event) => setForm((current) => ({ ...current, blocksAgenda: event.target.checked }))} type="checkbox" /><span>Blokir pembuatan agenda pada tanggal kegiatan</span></label> : <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200 sm:col-span-2">Upacara Hari Nasional dikenali berdasarkan jenis kegiatan dan menerapkan penyesuaian jadwal otomatis.</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-700 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">{editingEvent && <button className="mr-auto rounded-xl border border-red-700 bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500" onClick={() => void deleteActivity(editingEvent)} type="button">Hapus kegiatan</button>}<button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => setDialogOpen(false)} type="button">Batal</button><button className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Simpan Kegiatan'}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
