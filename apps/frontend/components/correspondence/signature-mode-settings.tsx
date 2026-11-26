'use client';
import { useEffect, useState } from 'react';
import { request } from '../../lib/api-client';

type SignatureMode = 'MANUAL' | 'TTE';
type Settings = { mode: SignatureMode; tteProviderConfigured: boolean; tteStatus: string };
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

export function SignatureModeSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<SignatureMode>('MANUAL');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void request<{ data: Settings }>('/correspondence/signature-settings')
      .then((result) => { setSettings(result.data); setMode(result.data.mode); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat pengaturan.'));
  }, []);

  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<{ data: Settings; message: string }>('/correspondence/signature-settings', {
        method: 'PATCH', body: JSON.stringify({ mode }),
      });
      setSettings(result.data); setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pengaturan gagal disimpan.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-6 space-y-5">
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <section className={panel}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Model tanda tangan surat</h2>
        <p className="mt-1 text-sm text-muted">Pilih model yang digunakan sekolah. Pengaturan ini berlaku untuk seluruh proses Persuratan.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button type="button" onClick={() => setMode('MANUAL')} className={'rounded-xl border p-4 text-left transition ' + (mode === 'MANUAL' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700')}>
            <span className="font-bold text-slate-900 dark:text-white">Tanda Tangan Manual</span>
            <p className="mt-2 text-sm text-muted">Surat dicetak, ditandatangani langsung oleh Kepala Sekolah, kemudian diarsipkan.</p>
            <span className="mt-3 inline-block text-xs font-semibold">{mode === 'MANUAL' ? 'Dipilih' : 'Pilih model ini'}</span>
          </button>
          <button type="button" onClick={() => setMode('TTE')} className={'rounded-xl border p-4 text-left transition ' + (mode === 'TTE' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700')}>
            <span className="font-bold text-slate-900 dark:text-white">Tanda Tangan Elektronik (TTE)</span>
            <p className="mt-2 text-sm text-muted">Surat ditandatangani secara digital melalui penyedia TTE/PSrE yang nantinya dikonfigurasi.</p>
            <span className="mt-3 inline-block text-xs font-semibold">{mode === 'TTE' ? 'Dipilih' : 'Pilih model ini'}</span>
          </button>
        </div>
        {settings?.mode === 'TTE' && !settings.tteProviderConfigured && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <b>TTE belum terhubung.</b> Mode TTE sudah dipilih, tetapi belum ada penyedia/sertifikat TTE yang terintegrasi. Sistem belum menerbitkan tanda tangan digital tersertifikasi. Persetujuan saat ini tetap tercatat sebagai persetujuan internal.
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || !settings || mode === settings.mode} onClick={() => void save()} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
          <span className="text-xs text-muted">Hanya Root dan Super Administrator yang dapat mengubah pengaturan ini.</span>
        </div>
      </section>
      <section className={panel}>
        <h3 className="font-semibold text-slate-900 dark:text-white">Catatan implementasi</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Mode Manual dan TTE merupakan pilihan global sekolah, bukan pilihan per surat.</li>
          <li>Penggantian mode tidak mengubah surat yang sudah disetujui.</li>
          <li>Aktivasi TTE tersertifikasi memerlukan integrasi penyedia PSrE, identitas penanda tangan, dan sertifikat yang sah.</li>
        </ul>
      </section>
    </div>
  );
}
