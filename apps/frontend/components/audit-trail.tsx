'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type ActivityTrailItem } from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const actionTone: Record<string, string> = {
  'attendance.submitted': 'bg-blue-50 text-blue-700 border-blue-100',
  'attendance.opened': 'bg-blue-50 text-blue-700 border-blue-100',
  'attendance.approved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'notification.sent': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'notification.failed': 'bg-red-50 text-red-700 border-red-100',
  'notification.retry': 'bg-amber-50 text-amber-700 border-amber-100',
  'schedule.updated': 'bg-violet-50 text-violet-700 border-violet-100',
  'schedule.created': 'bg-violet-50 text-violet-700 border-violet-100',
  'schedule.deleted': 'bg-red-50 text-red-700 border-red-100',
  'agenda.generated': 'bg-sky-50 text-sky-700 border-sky-100',
};

export function AuditTrail() {
  const [activities, setActivities] = useState<ActivityTrailItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
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

  useEffect(() => {
    void loadActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return activities;
    }

    return activities.filter((activity) =>
      [
        activity.action,
        activity.description,
        activity.entityType,
        activity.entityId,
        activity.source,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activities, query]);

  return (
    <section className="mt-10 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Trail</h2>
          <p className="mt-1 text-sm text-muted">
            Timeline aktivitas untuk debugging operasional.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-600 sm:w-64"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari aktivitas..."
            value={query}
          />
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            onClick={() => void loadActivities()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Audit trail belum bisa dimuat. Pastikan backend berjalan.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {filteredActivities.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} />
        ))}

        {loadState === 'success' && filteredActivities.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
            Belum ada aktivitas yang cocok.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ActivityCard({ activity }: { activity: ActivityTrailItem }) {
  return (
    <article className="relative rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-sm font-bold text-white">
            {formatTime(activity.time)}
          </div>
          <div className="mt-3 h-full w-px bg-blue-100" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-xs font-bold ${
                actionTone[activity.action] ??
                'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {activity.action}
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">
              {activity.source}
            </span>
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
