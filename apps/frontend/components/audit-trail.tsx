'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type ActivityTrailItem, type LoginAuditItem } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading';
import { SearchInput } from './ui/search';
import { SurfaceCard } from './ui/card';
import { formatSchoolDate, formatSchoolDateTime, getSchoolDateKey } from '../lib/school-time';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type CalendarDay = { date: string; count: number; auditCount: number; loginCount: number; notificationCount: number };

const actionTone: Record<string, string> = {
  'attendance.submitted': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/20',
  'attendance.opened': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/20',
  'attendance.approved': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20',
  'notification.sent': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20',
  'notification.failed': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/20',
  'notification.retry': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/20',
  'schedule.updated': 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/20',
  'schedule.created': 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/20',
  'schedule.deleted': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/20',
  'agenda.generated': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/20',
};

const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const monthLabel = (value: Date) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(value);
const dateKey = (value: Date) => getSchoolDateKey(value);

export function AuditTrail() {
  const [activities, setActivities] = useState<ActivityTrailItem[]>([]);
  const [loginAudits, setLoginAudits] = useState<LoginAuditItem[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => { const [year, month] = getSchoolDateKey().split('-').map(Number); return new Date(Date.UTC(year, month - 1, 1, 12)); });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [query, setQuery] = useState('');

  const monthKey = visibleMonth.getUTCFullYear() + '-' + String(visibleMonth.getUTCMonth() + 1).padStart(2, '0');

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const response = await api.getAuditCalendar(monthKey);
      setCalendarDays(response.data);
      const currentSelection = selectedDate.slice(0, 7) === monthKey;
      if (!currentSelection && response.data.length) {
        setSelectedDate(response.data[response.data.length - 1].date);
      } else if (!currentSelection) {
        setSelectedDate(`${monthKey}-01`);
      }
    } catch {
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [monthKey, selectedDate]);

  const loadDetails = useCallback(async () => {
    if (!selectedDate) return;
    setLoadState('loading');
    try {
      const [activityResponse, loginResponse] = await Promise.all([
        api.getActivityTrail(selectedDate),
        api.getLoginAudit(selectedDate),
      ]);
      setActivities(activityResponse.data);
      setLoginAudits(loginResponse.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }, [selectedDate]);

  useEffect(() => { void loadCalendar(); }, [loadCalendar]);
  useEffect(() => { void loadDetails(); }, [loadDetails]);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activities.filter((activity) => !normalizedQuery || [
      activity.action, activity.description, activity.entityType, activity.entityId, activity.source, activity.actor,
      activity.notification?.channel, activity.notification?.status, activity.notification?.recipient,
      activity.notification?.recipientName, activity.notification?.subject, activity.notification?.message,
      activity.notification?.templateKey, activity.notification?.lastError,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  }, [activities, query]);

  const auditLogs = filteredActivities.filter((activity) => activity.source !== 'notification');
  const notificationLogs = filteredActivities.filter((activity) => activity.source === 'notification');

  const daysInMonth = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0, 12)).getUTCDate();
  const leadingDays = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1, 12)).getUTCDay();
  const counts = useMemo(() => new Map(calendarDays.map((day) => [day.date, day.count])), [calendarDays]);
  const totalCount = calendarDays.reduce((sum, day) => sum + day.count, 0);
  const selectedCalendarDay = calendarDays.find((day) => day.date === selectedDate);

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1, 12)));
  }
  function changeYear(offset: number) {
    setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear() + offset, current.getUTCMonth(), 1, 12)));
  }
  function goToday() {
    const today = new Date();
    const [year, month] = dateKey(today).split('-').map(Number);
    setVisibleMonth(new Date(Date.UTC(year, month - 1, 1, 12)));
    setSelectedDate(dateKey(today));
  }

  return (
    <SurfaceCard className="mt-8 rounded-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Audit Trail</h2>
          <p className="mt-1 text-sm text-muted">Pilih tanggal untuk melihat aktivitas sistem, notifikasi, dan riwayat login.</p>
        </div>
        <Button onClick={() => { void loadCalendar(); void loadDetails(); }}>Refresh</Button>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 sm:p-4" aria-label="Kalender aktivitas">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-sky-600 px-4 py-4 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Riwayat Sekolah</p><h3 className="mt-1 text-lg font-black capitalize sm:text-xl">{monthLabel(visibleMonth)}</h3><p className="mt-1 text-[11px] font-medium text-blue-100">Pilih tanggal untuk melihat aktivitas</p></div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Tahun sebelumnya" onClick={() => changeYear(-1)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/15 text-sm font-bold text-white hover:bg-white/25">«</button>
              <button type="button" aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/15 text-lg font-bold text-white hover:bg-white/25">‹</button>
              <button type="button" aria-label="Bulan berikutnya" onClick={() => changeMonth(1)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/15 text-lg font-bold text-white hover:bg-white/25">›</button>
              <button type="button" aria-label="Tahun berikutnya" onClick={() => changeYear(1)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/15 text-sm font-bold text-white hover:bg-white/25">»</button>
              <button type="button" onClick={goToday} className="ml-1 rounded-lg border border-white/10 bg-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/25">Hari ini</button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1">
          {weekdays.map((day, index) => <div key={day} className={`py-2 text-center text-[11px] font-semibold ${index === 0 ? 'text-rose-600 dark:text-rose-300' : 'text-muted'}`}>{day}</div>)}
          {Array.from({ length: leadingDays }, (_, index) => <div key={`empty-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const key = dateKey(new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), day, 12)));
            const count = counts.get(key) ?? 0;
            const selected = selectedDate === key;
            const today = key === dateKey(new Date());
            return (
              <button key={key} type="button" onClick={() => setSelectedDate(key)} aria-pressed={selected}
                className={`relative calendar-day-cell flex min-w-0 flex-col items-center justify-center rounded-xl border text-base transition-colors sm:text-lg ${selected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-100 bg-white text-slate-700 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'} ${today && !selected ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900' : ''} ${!selected && new Date(`${key}T12:00:00`).getDay() === 0 ? '!border-rose-100 !bg-rose-50/70 !text-rose-600 dark:!border-rose-900/60 dark:!bg-rose-950/25 dark:!text-rose-300' : ''}`}>
                <span className={today ? 'font-extrabold' : 'font-semibold'}>{day}</span>
                {count > 0 ? <span className={`mt-0.5 min-w-4 rounded-full px-1 text-[9px] font-bold leading-4 ${selected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>{count > 99 ? '99+' : count}</span> : <span className="mt-0.5 h-4" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Tanggal dengan aktivitas</span>
          <span>{calendarLoading ? 'Memuat kalender…' : `${totalCount.toLocaleString('id-ID')} aktivitas bulan ini`}</span>
        </div>
      </section>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto]">
        <SearchInput id="audit-search" onClear={() => setQuery('')} onChange={(event) => setQuery(event.target.value)} placeholder="Cari aktivitas atau pengguna..." value={query} />
        <div className="flex flex-col justify-center rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <span>{formatSchoolDate(selectedDate)}</span>
          {selectedCalendarDay ? <span className="mt-0.5 text-[11px] font-medium text-muted">Kalender: Audit {selectedCalendarDay.auditCount} · Login {selectedCalendarDay.loginCount} · Notifikasi {selectedCalendarDay.notificationCount}</span> : null}
        </div>
      </div>

      {loadState === 'error' ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Audit trail belum bisa dimuat. Pastikan backend berjalan.</div> : null}
      {loadState === 'loading' ? <div className="mt-5"><LoadingState label="Memuat audit trail..." /></div> : null}

      <section className="mt-6" aria-labelledby="audit-log-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="audit-log-heading" className="text-base font-bold text-slate-900 dark:text-white">Riwayat Aktivitas</h3>
          <Badge tone="muted">{auditLogs.length}</Badge>
        </div>
        <div className="max-h-[min(24rem,48vh)] space-y-3 overflow-y-auto pr-1">
          {auditLogs.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
          {loadState === 'success' && auditLogs.length === 0 ? <EmptyState title="Belum ada aktivitas pada tanggal ini." /> : null}
        </div>
      </section>

      <LoginAuditPanel audits={loginAudits} query={query} loadState={loadState} />

      <section className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700" aria-labelledby="notification-log-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="notification-log-heading" className="text-base font-bold text-slate-900 dark:text-white">Riwayat Notifikasi</h3>
          <Badge tone="muted">{notificationLogs.length}</Badge>
        </div>
        <div className="max-h-[min(24rem,48vh)] space-y-3 overflow-y-auto pr-1">
          {notificationLogs.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
          {loadState === 'success' && notificationLogs.length === 0 ? <EmptyState title="Belum ada notifikasi pada tanggal ini." /> : null}
        </div>
      </section>
    </SurfaceCard>
  );
}

function LoginAuditPanel({ audits, query, loadState }: { audits: LoginAuditItem[]; query: string; loadState: LoadState }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = audits.filter((audit) => {
    const haystack = [audit.email, audit.status, audit.ipAddress, audit.userAgent, audit.reason, audit.user?.name, audit.user?.username, ...(audit.user?.roles ?? [])].filter(Boolean).join(' ').toLowerCase();
    return !normalizedQuery || haystack.includes(normalizedQuery);
  });
  return (
    <section className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700" aria-labelledby="login-audit-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="login-audit-heading" className="text-base font-bold text-slate-900 dark:text-white">Riwayat Login</h3>
        <Badge tone="muted">{filtered.length}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Siapa yang login, dari IP mana, menggunakan browser/perangkat apa, dan kapan.</p>
      <div className="mt-4 max-h-[min(24rem,48vh)] space-y-3 overflow-y-auto pr-1">
        {filtered.map((audit) => <LoginAuditCard audit={audit} key={audit.id} />)}
        {loadState === 'success' && filtered.length === 0 ? <EmptyState title="Belum ada riwayat login pada tanggal ini." /> : null}
      </div>
    </section>
  );
}

function LoginAuditCard({ audit }: { audit: LoginAuditItem }) {
  const statusClass = audit.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';
  return (
    <article className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:bg-[var(--surface-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><p className="font-bold text-slate-900 dark:text-white">{audit.user?.name ?? audit.email}</p><p className="break-all text-xs text-muted">Login dengan: {audit.email}</p><p className="text-xs text-muted">{audit.user?.username ? `@${audit.user.username} · ` : ''}{audit.user?.roles.join(', ') || 'User tidak ditemukan'}</p></div>
        <Badge className={statusClass} tone="muted">{audit.status === 'SUCCESS' ? 'Berhasil' : 'Gagal'}</Badge>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-muted sm:grid-cols-2">
        <p>Waktu: {formatSchoolDateTime(audit.createdAt)}</p><p>IP: {audit.ipAddress ?? '-'}</p>
        <p className="sm:col-span-2">Browser/Perangkat: {getDeviceLabel(audit.userAgent)} <span className="break-all">({audit.userAgent ?? 'tidak tersedia'})</span></p>
        {audit.reason ? <p className="sm:col-span-2">Keterangan: {audit.reason}</p> : null}
      </div>
    </article>
  );
}

function getDeviceLabel(userAgent?: string | null) {
  if (!userAgent) return 'Tidak diketahui';
  const browser = userAgent.includes('Edg/') ? 'Microsoft Edge' : userAgent.includes('Chrome/') ? 'Google Chrome' : userAgent.includes('Firefox/') ? 'Mozilla Firefox' : userAgent.includes('Safari/') ? 'Safari' : 'Browser lain';
  const device = /Android/i.test(userAgent) ? 'Android' : /iPhone|iPad/i.test(userAgent) ? 'iOS' : /Windows/i.test(userAgent) ? 'Windows' : /Macintosh|Mac OS X/i.test(userAgent) ? 'macOS' : /Linux/i.test(userAgent) ? 'Linux' : 'Perangkat lain';
  return `${browser} · ${device}`;
}

function ActivityCard({ activity }: { activity: ActivityTrailItem }) {
  if (activity.source === 'notification' && activity.notification) {
    return <NotificationActivityCard activity={activity} />;
  }

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:bg-[var(--surface-soft)] dark:shadow-black/20 sm:p-5">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center"><div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white">{formatTime(activity.time)}</div><div className="mt-3 h-full w-px bg-blue-100 dark:bg-[var(--border-strong)]" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><Badge className={actionTone[activity.action] ?? 'border-slate-200 bg-white text-slate-700 dark:bg-[var(--surface-solid)]'} tone="muted">{friendlyAction(activity.action)}</Badge></div>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{activity.description || friendlyAction(activity.action)}</h3>
          <p className="mt-1 text-sm text-muted">{friendlyEntity(activity.entityType)}</p>
          {activity.actor ? <p className="mt-2 text-xs text-slate-500">Dilakukan oleh <span className="font-semibold text-slate-700 dark:text-slate-200">{activity.actor}</span></p> : null}
        </div>
      </div>
    </article>
  );
}

function NotificationActivityCard({ activity }: { activity: ActivityTrailItem }) {
  const notification = activity.notification!;
  const statusLabel = notification.status === 'SENT' ? 'Terkirim' : notification.status === 'FAILED' ? 'Gagal' : 'Menunggu';
  const statusClass = notification.status === 'SENT'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200'
    : notification.status === 'FAILED'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200';

  return (
    <article className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:bg-[var(--surface-soft)] dark:shadow-black/20 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
            <span className="text-xs font-bold">{formatTime(activity.time)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white">{notification.subject || notification.templateKey || 'Notifikasi'}</p>
            <p className="mt-0.5 text-xs text-muted">{notification.channel.replace('_', ' ')} · {notification.recipientName || notification.recipient}</p>
          </div>
        </div>
        <Badge className={statusClass} tone="muted">{statusLabel}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{notification.message}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-muted dark:border-slate-700">
        <span>Penerima: {notification.recipient}</span>
        <span>Percobaan: {notification.attempts}</span>
        <span>Waktu: {formatSchoolDateTime(activity.time)}</span>
      </div>
      {notification.lastError ? <p className="mt-2 break-words rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200">Keterangan gagal: {notification.lastError}</p> : null}
    </article>
  );
}


function friendlyAction(action: string) {
  const labels: Record<string, string> = {'attendance.submitted':'Presensi dikirim','attendance.opened':'Presensi dibuka','attendance.approved':'Presensi disetujui','notification.sent':'Notifikasi terkirim','notification.failed':'Notifikasi gagal','notification.retry':'Notifikasi dicoba ulang','schedule.updated':'Jadwal diperbarui','schedule.created':'Jadwal ditambahkan','schedule.deleted':'Jadwal dihapus','agenda.generated':'Agenda dibuat'};
  if (labels[action]) return labels[action];
  const words=action.replace(/[._-]+/g,' ').trim(); return words ? words.charAt(0).toUpperCase()+words.slice(1) : 'Perubahan data';
}
function friendlyEntity(entityType: string) {
  const labels: Record<string,string>={attendance:'Data presensi',schedule:'Data jadwal',teacher:'Data guru',student:'Data peserta didik',class:'Data rombongan belajar',user:'Data akun',academic_calendar:'Kalender akademik',school_year:'Tahun ajaran',notification:'Pengiriman notifikasi'};
  const key=entityType.toLowerCase().replace(/[ -]+/g,'_'); return labels[key] ?? (entityType ? 'Bagian: '+entityType.replace(/[._-]+/g,' ') : 'Perubahan data');
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}
