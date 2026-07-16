'use client';

import { useEffect, useRef, useState } from 'react';
import {
  api,
  type FailedJob,
  type OperationsDashboard,
  type SchoolYear,
} from '../lib/api';
import { formatNumber } from '../lib/format';
import {
  emptyOperationsBackups,
  emptyOperationsDashboard,
  formatBytes,
  formatLatency,
  formatUptime,
} from './operations-center/operations-center-utils';
import {
  HealthCard,
  MetricCard,
  PayloadDialog,
  QueueCount,
  StatusPill,
} from './operations-center/operations-status-components';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function OperationsCenter() {
  const [dashboard, setDashboard] =
    useState<OperationsDashboard>(emptyOperationsDashboard);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<FailedJob | null>(null);
  const [backups, setBackups] = useState(emptyOperationsBackups);
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
      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Dashboard Operasional</h2>
            <p className="mt-1 text-sm text-muted">
              Status runtime untuk database, Redis, queue, worker, dan notifikasi.
            </p>
          </div>
          <Button
            onClick={() => void loadDashboard()}
          >
            Refresh
          </Button>
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

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 shadow-sm dark:border-sky-400/20 dark:bg-sky-400/10 dark:shadow-none sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="CPU Load"
              tone={dashboard.runtime.cpu.loadPercent >= 80 ? 'danger' : dashboard.runtime.cpu.loadPercent >= 60 ? 'warning' : 'info'}
              value={`${dashboard.runtime.cpu.loadPercent}%`}
            />
            <MetricCard
              label="RAM Server"
              tone={dashboard.runtime.memory.systemUsedPercent >= 85 ? 'danger' : dashboard.runtime.memory.systemUsedPercent >= 70 ? 'warning' : 'info'}
              value={`${dashboard.runtime.memory.systemUsedPercent}%`}
            />
            <MetricCard
              label="RAM Backend"
              tone="info"
              value={formatBytes(dashboard.runtime.memory.processRssBytes)}
            />
            <MetricCard
              label="Request/menit"
              tone="info"
              value={formatNumber(dashboard.requests.requestsPerMinute)}
            />
            <MetricCard
              label="Error/menit"
              tone={dashboard.requests.errorsPerMinute > 0 ? 'danger' : 'info'}
              value={formatNumber(dashboard.requests.errorsPerMinute)}
            />
            <MetricCard
              label="Uptime"
              tone="info"
              value={formatUptime(dashboard.runtime.uptimeSeconds)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <HealthCard
            detail="Redis ping"
            label="Redis"
            status={dashboard.health.redis}
            value={formatLatency(dashboard.diagnostics?.redisLatencyMs)}
          />
          <HealthCard
            detail="waiting + active + delayed"
            label="Queue"
            status={dashboard.health.queue}
            value={formatNumber(dashboard.queueTotals.waiting + dashboard.queueTotals.active + dashboard.queueTotals.delayed)}
          />
          <HealthCard
            detail="failed jobs"
            label="Worker"
            status={dashboard.health.worker}
            value={formatNumber(dashboard.queueTotals.failed)}
          />
          <HealthCard
            detail="SELECT 1 latency"
            label="Database"
            status={dashboard.health.database}
            value={formatLatency(dashboard.diagnostics?.databaseLatencyMs)}
          />
          <HealthCard
            detail="pending + failed"
            label="Notification"
            status={dashboard.health.notification}
            value={formatNumber((dashboard.queueTotals.notification?.waiting ?? 0) + (dashboard.queueTotals.notification?.failed ?? 0))}
          />
          <HealthCard
            detail={dashboard.storageSummary ? formatBytes(dashboard.storageSummary.totalSizeBytes) : 'usage tidak tersedia'}
            label="Cloudflare R2"
            status={dashboard.health.storage}
            tone={!dashboard.storageSummary && dashboard.storageError ? 'warning' : undefined}
            value={dashboard.storageSummary ? `${formatNumber(dashboard.storageSummary.objectCount)} file` : 'Aktif'}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
            <p className="font-black text-slate-900 dark:text-[var(--text)]">Traffic API</p>
            <p className="mt-1">
              {formatNumber(dashboard.requests.recentRequests)} request dalam {Math.round(dashboard.requests.windowSeconds / 60)} menit terakhir · rata-rata {dashboard.requests.averageDurationMs} ms.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
            <p className="font-black text-slate-900 dark:text-[var(--text)]">Notification Queue</p>
            <p className="mt-1">
              Waiting {formatNumber(dashboard.queueTotals.notification?.waiting ?? 0)} · Active {formatNumber(dashboard.queueTotals.notification?.active ?? 0)} · Failed {formatNumber(dashboard.queueTotals.notification?.failed ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
            <p className="font-black text-slate-900 dark:text-[var(--text)]">Attendance Queue</p>
            <p className="mt-1">
              Waiting {formatNumber(dashboard.queueTotals.attendance?.waiting ?? 0)} · Active {formatNumber(dashboard.queueTotals.attendance?.active ?? 0)} · Failed {formatNumber(dashboard.queueTotals.attendance?.failed ?? 0)}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
          <p className="font-black text-slate-900 dark:text-[var(--text)]">Cloudflare R2 Storage</p>
          {dashboard.storageSummary ? (
            <p className="mt-1">Bucket <strong>{dashboard.storageSummary.bucket}</strong> · <strong>{formatNumber(dashboard.storageSummary.objectCount)}</strong> file · <strong>{formatBytes(dashboard.storageSummary.totalSizeBytes)}</strong>{dashboard.storageSummary.isPartial ? ' (minimum, pemindaian dibatasi 10.000 file)' : ''}</p>
          ) : <p className="mt-1 text-amber-700 dark:text-amber-200">{dashboard.storageError ?? 'Storage aktif, tetapi detail penggunaan belum tersedia.'}</p>}
        </div>
      </div>

      <div className="surface-card rounded-lg p-4 sm:p-6">
        <div><h2 className="text-lg font-bold">Backup & Arsip</h2><p className="mt-1 text-sm text-muted">Backup harian langsung diunduh ke perangkat admin. Arsip tahun ajaran disimpan di server.</p></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="font-bold">Backup Harian</p><p className="mt-1 text-sm text-muted">Snapshot seluruh database untuk disimpan di perangkat ini.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button className="school-primary-button rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={backupState === 'loading'} onClick={() => void createDailyBackup()} type="button">{backupState === 'loading' ? 'Menyiapkan...' : 'Download Backup'}</button><button className="secondary-button rounded-xl px-4 py-2 text-sm font-black" onClick={() => restoreInputRef.current?.click()} type="button">Restore Backup</button><input accept=".dump" className="hidden" onChange={(event) => void restoreBackup(event.target.files?.[0])} ref={restoreInputRef} type="file" /></div></section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="font-bold">Arsip Tahun Ajaran</p><p className="mt-1 text-sm text-muted">Simpan snapshot relasional untuk tahun ajaran terpilih.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><select className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm" onChange={(event) => setSchoolYearId(event.target.value)} value={schoolYearId}><option value="">Pilih tahun ajaran</option>{backups.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select><button className="secondary-button rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60" disabled={!schoolYearId || backupState === 'loading'} onClick={() => void createAcademicBackup()} type="button">Arsipkan</button></div></section>
        </div>
      </div>

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
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

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
        <h2 className="text-2xl font-bold">Failed Jobs</h2>
        <p className="mt-1 text-sm text-muted">
          Retry, discard, atau inspeksi payload job yang gagal.
        </p>

        <div className="mt-5 space-y-3">
          {dashboard.failedJobs.map((job) => (
            <article
              className="rounded-3xl border border-red-100 bg-red-50/50 p-4 dark:border-red-400/20 dark:bg-red-500/10"
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
                  <Button
                    onClick={() => void handleRetry(job)}
                    size="sm"
                  >
                    Retry
                  </Button>
                  <Button
                    className="border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                    onClick={() => void handleDiscard(job)}
                    size="sm"
                    variant="outline"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={() => setSelectedJob(job)}
                    size="sm"
                    variant="outline"
                  >
                    View Payload
                  </Button>
                </div>
              </div>
            </article>
          ))}

          {loadState === 'success' && dashboard.failedJobs.length === 0 ? (
            <EmptyState title="Tidak ada failed job." />
          ) : null}
        </div>
      </div>

      {selectedJob ? (
        <PayloadDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
      ) : null}
    </section>
  );
}
