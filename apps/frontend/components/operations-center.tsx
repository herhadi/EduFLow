'use client';

import { useEffect, useState } from 'react';
import {
  api,
  type FailedJob,
  type HealthStatus,
  type OperationsDashboard,
} from '../lib/api';
import { formatNumber } from '../lib/format';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const emptyDashboard: OperationsDashboard = {
  health: {
    redis: 'Unhealthy',
    queue: 'Unhealthy',
    worker: 'Unhealthy',
    database: 'Unhealthy',
    notification: 'Unhealthy',
  },
  queues: [],
  failedJobs: [],
};

export function OperationsCenter() {
  const [dashboard, setDashboard] =
    useState<OperationsDashboard>(emptyDashboard);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<FailedJob | null>(null);

  async function loadDashboard() {
    setLoadState('loading');

    try {
      const response = await api.getOperationsDashboard();
      setDashboard(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleRetry(job: FailedJob) {
    setMessage(null);

    try {
      const response = await api.retryJob(job.queueName, job.id);
      setMessage(response.message ?? 'Job dikirim ulang.');
      await loadDashboard();
    } catch {
      setMessage('Retry job gagal. Pastikan Redis dan worker berjalan.');
    }
  }

  async function handleDiscard(job: FailedJob) {
    setMessage(null);

    try {
      const response = await api.discardJob(job.queueName, job.id);
      setMessage(response.message ?? 'Job dihapus.');
      await loadDashboard();
    } catch {
      setMessage('Discard job gagal. Job mungkin sedang aktif atau sudah hilang.');
    }
  }

  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Dashboard Operasional</h2>
            <p className="mt-1 text-sm text-muted">
              Status runtime untuk database, Redis, queue, worker, dan notifikasi.
            </p>
          </div>
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            onClick={() => void loadDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loadState === 'error' ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Health check belum bisa dimuat. Pastikan backend berjalan.
          </div>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <HealthCard label="Redis" status={dashboard.health.redis} />
          <HealthCard label="Queue" status={dashboard.health.queue} />
          <HealthCard label="Worker" status={dashboard.health.worker} />
          <HealthCard label="Database" status={dashboard.health.database} />
          <HealthCard
            label="Notification"
            status={dashboard.health.notification}
          />
        </div>
      </div>

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <h2 className="text-2xl font-bold">Queue Monitoring</h2>
        <p className="mt-1 text-sm text-muted">
          Pantau waiting, active, failed, delayed, dan completed jobs.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {dashboard.queues.map((queue) => (
            <article
              className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
              key={queue.name}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{queue.label}</h3>
                  <p className="text-xs text-muted">{queue.name}</p>
                </div>
                <StatusPill status={queue.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <QueueCount label="waiting" value={queue.waiting} />
                <QueueCount label="active" value={queue.active} />
                <QueueCount label="failed" value={queue.failed} danger />
                <QueueCount label="delayed" value={queue.delayed} />
                <QueueCount label="completed" value={queue.completed} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <h2 className="text-2xl font-bold">Failed Jobs</h2>
        <p className="mt-1 text-sm text-muted">
          Retry, discard, atau inspeksi payload job yang gagal.
        </p>

        <div className="mt-5 space-y-3">
          {dashboard.failedJobs.map((job) => (
            <article
              className="rounded-3xl border border-red-100 bg-red-50/50 p-4"
              key={`${job.queueName}-${job.id}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.08em] text-red-700 uppercase">
                    {job.queueLabel}
                  </p>
                  <h3 className="mt-1 font-bold">{job.name}</h3>
                  <p className="mt-1 text-sm text-red-700">
                    {job.failedReason ?? 'Tidak ada error message.'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Job ID {job.id} · attempts {job.attemptsMade}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => void handleRetry(job)}
                    type="button"
                  >
                    Retry
                  </button>
                  <button
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                    onClick={() => void handleDiscard(job)}
                    type="button"
                  >
                    Discard
                  </button>
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() => setSelectedJob(job)}
                    type="button"
                  >
                    View Payload
                  </button>
                </div>
              </div>
            </article>
          ))}

          {loadState === 'success' && dashboard.failedJobs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
              Tidak ada failed job. Mesin lagi adem.
            </p>
          ) : null}
        </div>
      </div>

      {selectedJob ? (
        <PayloadDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
      ) : null}
    </section>
  );
}

function HealthCard({ label, status }: { label: string; status: HealthStatus }) {
  const isHealthy = status === 'Healthy';

  return (
    <article
      className={`rounded-3xl border p-4 ${
        isHealthy
          ? 'border-blue-100 bg-blue-50 text-blue-700'
          : 'border-red-100 bg-red-50 text-red-700'
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <strong className="mt-2 block text-lg">{status}</strong>
    </article>
  );
}

function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        status === 'Healthy'
          ? 'bg-blue-50 text-blue-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {status}
    </span>
  );
}

function QueueCount({
  danger,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs text-muted">{label}</p>
      <strong className={danger && value > 0 ? 'text-red-700' : 'text-slate-900'}>
        {formatNumber(value)}
      </strong>
    </div>
  );
}

function PayloadDialog({
  job,
  onClose,
}: {
  job: FailedJob;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 sm:place-items-center">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-xl font-bold">Payload Job</h3>
            <p className="text-sm text-muted">
              {job.queueLabel} · {job.name}
            </p>
          </div>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
        </div>
        <pre className="max-h-[60vh] overflow-auto bg-slate-950 p-5 text-xs leading-6 text-blue-50">
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
