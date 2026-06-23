'use client';

import { useEffect, useRef, useState } from 'react';
import {
  api,
  type FailedJob,
  type HealthStatus,
  type OperationsDashboard,
  type OperationsBackups,
  type SchoolYear,
} from '../lib/api';
import { formatNumber } from '../lib/format';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const emptyDashboard: OperationsDashboard = {
  health: {
    redis: 'Unhealthy',
    queue: 'Unhealthy',
    worker: 'Unhealthy',
    database: 'Unhealthy',
    notification: 'Unhealthy',
    storage: 'Unhealthy',
  },
  queues: [],
  failedJobs: [],
  storageSummary: null,
  storageError: null,
};
const emptyBackups: OperationsBackups = { daily: [], academicYears: [] };

export function OperationsCenter() {
  const [dashboard, setDashboard] =
    useState<OperationsDashboard>(emptyDashboard);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<FailedJob | null>(null);
  const [backups, setBackups] = useState<OperationsBackups>(emptyBackups);
  const [backupState, setBackupState] = useState<'idle' | 'loading'>('idle');
  const [schoolYearId, setSchoolYearId] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

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
    void loadBackups();
  }, []);

  async function loadBackups() {
    const schoolYearResponse = await api.getSchoolYears();
    const academicYears: SchoolYear[] = schoolYearResponse.data;
    setBackups((current) => ({ ...current, academicYears }));
    setSchoolYearId((current) => current || academicYears[0]?.id || '');
  }
  async function createDailyBackup() { setBackupState('loading'); try { await api.createDailyBackup(); setMessage('Backup harian sedang diunduh ke perangkat ini.'); } catch { setMessage('Backup harian gagal dibuat.'); } finally { setBackupState('idle'); } }
  async function createAcademicBackup() { if (!schoolYearId) return; setBackupState('loading'); try { const response = await api.createAcademicYearBackup(schoolYearId); setMessage(response.message ?? 'Arsip tahun ajaran berhasil dibuat.'); } catch { setMessage('Arsip tahun ajaran gagal dibuat.'); } finally { setBackupState('idle'); } }
  async function restoreBackup(file?: File) { if (!file || !window.confirm('Restore akan menimpa seluruh database. Lanjutkan?')) return; setBackupState('loading'); try { const response = await api.restoreDailyBackup(file); setMessage(response.message ?? 'Restore selesai.'); } catch { setMessage('Restore gagal.'); } finally { setBackupState('idle'); } }

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
      <div className="surface-card rounded-lg p-4 sm:p-6">
        <div><h2 className="text-lg font-bold">Backup & Arsip</h2><p className="mt-1 text-sm text-muted">Backup harian langsung diunduh ke perangkat admin. Arsip tahun ajaran disimpan di server.</p></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="font-bold">Backup Harian</p><p className="mt-1 text-sm text-muted">Snapshot seluruh database untuk disimpan di perangkat ini.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button className="school-primary-button rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={backupState === 'loading'} onClick={() => void createDailyBackup()} type="button">{backupState === 'loading' ? 'Menyiapkan...' : 'Download Backup'}</button><button className="secondary-button rounded-xl px-4 py-2 text-sm font-black" onClick={() => restoreInputRef.current?.click()} type="button">Restore Backup</button><input accept=".dump" className="hidden" onChange={(event) => void restoreBackup(event.target.files?.[0])} ref={restoreInputRef} type="file" /></div></section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="font-bold">Arsip Tahun Ajaran</p><p className="mt-1 text-sm text-muted">Simpan snapshot relasional untuk tahun ajaran terpilih.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><select className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm" onChange={(event) => setSchoolYearId(event.target.value)} value={schoolYearId}><option value="">Pilih tahun ajaran</option>{backups.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select><button className="secondary-button rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60" disabled={!schoolYearId || backupState === 'loading'} onClick={() => void createAcademicBackup()} type="button">Arsipkan</button></div></section>
        </div>
      </div>
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

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <HealthCard label="Redis" status={dashboard.health.redis} />
          <HealthCard label="Queue" status={dashboard.health.queue} />
          <HealthCard label="Worker" status={dashboard.health.worker} />
          <HealthCard label="Database" status={dashboard.health.database} />
          <HealthCard
            label="Notification"
            status={dashboard.health.notification}
          />
          <HealthCard label="Cloudflare R2" status={dashboard.health.storage} />
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-black text-slate-900">Cloudflare R2 Storage</p>
          {dashboard.storageSummary ? (
            <p className="mt-1">Bucket <strong>{dashboard.storageSummary.bucket}</strong> · <strong>{formatNumber(dashboard.storageSummary.objectCount)}</strong> file · <strong>{formatBytes(dashboard.storageSummary.totalSizeBytes)}</strong>{dashboard.storageSummary.isPartial ? ' (minimum, pemindaian dibatasi 10.000 file)' : ''}</p>
          ) : <p className="mt-1 text-rose-700">{dashboard.storageError ?? 'Detail penggunaan tidak tersedia karena bucket tidak dapat diakses.'}</p>}
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
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]"
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
      className={`rounded-2xl border p-4 ${
        isHealthy
          ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-200'
          : 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200'
      }`}
    >
      <p className="text-sm font-semibold text-slate-600 dark:text-[var(--text-soft)]">{label}</p>
      <strong className="mt-2 block text-lg">{status}</strong>
    </article>
  );
}

function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        status === 'Healthy'
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
          : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200'
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
    <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
      <p className="text-xs text-muted">{label}</p>
      <strong
        className={
          danger && value > 0
            ? 'text-red-700 dark:text-red-200'
            : 'text-slate-900 dark:text-[var(--text)]'
        }
      >
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
