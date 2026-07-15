'use client';

import { useEffect, useState } from 'react';
import {
  api,
  type ParentPortalSummary,
} from '../lib/api';
import {
  ParentSummaryCard,
  ParentTodayBoard,
  StudentHistoryCard,
  StudentOverviewCard,
} from './parent-portal/parent-portal-sections';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type ParentPortalMode = 'overview' | 'history' | 'full';

export function ParentPortal({
  initialContact = '',
  mode = 'full',
  title = 'Pantau Kehadiran Anak',
}: {
  initialContact?: string;
  mode?: ParentPortalMode;
  title?: string;
}) {
  const [contact, setContact] = useState(initialContact);
  const [summary, setSummary] = useState<ParentPortalSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const showLookup = !initialContact;

  async function loadPortal(contactValue = contact) {
    if (!contactValue.trim()) {
      setLoadState('idle');
      return;
    }

    setLoadState('loading');

    try {
      const response = await api.getParentPortalSummary(contactValue);
      setSummary(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
      setSummary(null);
    }
  }

  useEffect(() => {
    if (initialContact) {
      void loadPortal(initialContact);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContact]);

  const showIntroCard = showLookup || mode !== 'overview';

  return (
    <section className="mt-6 space-y-5">
      {showIntroCard ? (
        <div className="surface-card rounded-[1.75rem] p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Portal Orang Tua</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {showLookup
              ? 'Masukkan nomor HP atau email wali murid untuk membuka ringkasan anak.'
              : mode === 'history'
                ? 'Riwayat presensi dan nilai harian yang sudah disubmit guru.'
                : 'Data ditampilkan dari akun wali murid yang sedang login.'}
          </p>

          {showLookup ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
                onChange={(event) => setContact(event.target.value)}
                placeholder="Contoh: wali@email.sch.id atau 0856..."
                value={contact}
              />
              <button
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:opacity-60"
                disabled={loadState === 'loading'}
                onClick={() => void loadPortal()}
                type="button"
              >
                {loadState === 'loading' ? 'Memuat...' : 'Lihat Data'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Data wali murid tidak ditemukan atau backend belum bisa diakses.
        </div>
      ) : null}

      {summary ? (
        <>
          {mode === 'overview' ? (
            <ParentTodayBoard summary={summary} />
          ) : (
            <>
              {mode === 'full' ? <ParentSummaryCard summary={summary} /> : null}

              <div className="space-y-4">
                {summary.students.map((student) =>
                  mode === 'history' ? (
                    <StudentHistoryCard key={student.id} student={student} />
                  ) : (
                    <StudentOverviewCard key={student.id} showHistory student={student} />
                  ),
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="surface-card rounded-[1.5rem] p-5 text-sm leading-6 text-muted">
          {showLookup
            ? 'Gunakan kontak wali murid yang terdaftar untuk membuka data anak.'
            : 'Data anak belum tersedia untuk akun ini. Pastikan email akun wali sama dengan email wali murid di data siswa.'}
        </div>
      )}
    </section>
  );
}
