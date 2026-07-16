'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ActivityTrailItem } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading';
import { SearchInput } from './ui/search';
import { SurfaceCard } from './ui/card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const actionTone: Record<string, string> = {
  'attendance.submitted':
    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/20',
  'attendance.opened':
    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/20',
  'attendance.approved':
    'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20',
  'notification.sent':
    'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20',
  'notification.failed':
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/20',
  'notification.retry':
    'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/20',
  'schedule.updated':
    'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/20',
  'schedule.created':
    'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/20',
  'schedule.deleted':
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/20',
  'agenda.generated':
    'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/20',
};

export function AuditTrail() {
  const [activities, setActivities] = useState<ActivityTrailItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [query, setQuery] = useState('');

  async function loadActivities() {
    setLoadState('loading');

    try {
      const response = await api.getActivityTrail();
      setActivities(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  function openDatePicker() {
    const input = dateInputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
  }

  useEffect(() => {
    void loadActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesDate =
        !selectedDate || formatDateInput(new Date(activity.time)) === selectedDate;
      const matchesQuery =
        !normalizedQuery ||
        [
          activity.action,
          activity.description,
          activity.entityType,
          activity.entityId,
          activity.source,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesDate && matchesQuery;
    });
  }, [activities, query, selectedDate]);

  return (
    <SurfaceCard className="mt-8 rounded-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Audit Trail</h2>
          <p className="mt-1 text-sm text-muted">
            Timeline aktivitas untuk debugging operasional.
          </p>
        </div>

        <div className="date-picker-control grid w-[8.25rem] shrink-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-1 rounded-xl py-1 pl-3 pr-1 sm:w-36">
          <label className="sr-only" htmlFor="audit-date">
            Tanggal audit
          </label>
          <input
            className="h-9 text-xs font-semibold sm:text-sm"
            id="audit-date"
            onChange={(event) => setSelectedDate(event.target.value)}
            ref={dateInputRef}
            type="date"
            value={selectedDate}
          />
          <button
            aria-label="Pilih tanggal audit"
            className="date-picker-control__button"
            onClick={openDatePicker}
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto]">
        <label className="sr-only" htmlFor="audit-search">
          Cari aktivitas
        </label>
        <SearchInput
          id="audit-search"
          onClear={() => setQuery('')}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari aktivitas..."
          value={query}
        />
        <Button onClick={() => void loadActivities()}>
          Refresh
        </Button>
      </div>

      {loadState === 'error' ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Audit trail belum bisa dimuat. Pastikan backend berjalan.
        </div>
      ) : null}

      <div className="mt-5 max-h-[min(34rem,62vh)] space-y-3 overflow-y-auto pr-1">
        {loadState === 'loading' ? (
          <LoadingState label="Memuat audit trail..." />
        ) : null}

        {filteredActivities.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} />
        ))}

        {loadState === 'success' && filteredActivities.length === 0 ? (
          <EmptyState title="Belum ada aktivitas yang cocok pada tanggal ini." />
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function ActivityCard({ activity }: { activity: ActivityTrailItem }) {
  return (
    <article className="relative rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:bg-[var(--surface-soft)] dark:shadow-black/20 sm:p-5">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            {formatTime(activity.time)}
          </div>
          <div className="mt-3 h-full w-px bg-blue-100 dark:bg-[var(--border-strong)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={actionTone[activity.action] ?? 'border-slate-200 bg-white text-slate-700 dark:bg-[var(--surface-solid)]'}
              tone="muted"
            >
              {activity.action}
            </Badge>
            <Badge className="border-slate-200 bg-white text-slate-600 dark:bg-[var(--surface-solid)]" tone="muted">
              {activity.source}
            </Badge>
          </div>

          <h3 className="mt-3 text-base font-bold text-slate-900">
            {activity.description}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {activity.entityType} · {activity.entityId}
          </p>

          {activity.actor ? (
            <p className="mt-2 text-xs text-slate-500">Actor: {activity.actor}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
    </svg>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const date = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
}
