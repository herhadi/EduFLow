'use client';

import { useState } from 'react';
import { api, type ImportSummary, type ImportType } from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const importItems: Array<{
  type: ImportType;
  title: string;
  filename: string;
  description: string;
  columns: string[];
}> = [
  {
    type: 'teachers',
    title: 'Guru',
    filename: 'Guru.xlsx',
    description: 'Import data guru pengajar.',
    columns: ['nama', 'nip', 'nuptk', 'email', 'no_hp', 'telegram_id', 'status'],
  },
  {
    type: 'students',
    title: 'Siswa',
    filename: 'Siswa.xlsx',
    description: 'Import siswa, enrollment kelas, dan wali utama.',
    columns: [
      'nama',
      'nis',
      'nisn',
      'jenis_kelamin',
      'tanggal_lahir',
      'kelas',
      'tahun_ajaran',
      'nama_wali',
      'hp_wali',
      'telegram_id_wali',
      'alamat_wali',
      'status',
    ],
  },
  {
    type: 'classes',
    title: 'Kelas',
    filename: 'Kelas.xlsx',
    description: 'Import rombongan belajar per tahun ajaran.',
    columns: ['nama', 'kode', 'tingkat', 'tahun_ajaran', 'wali_kelas'],
  },
  {
    type: 'subjects',
    title: 'Mata Pelajaran',
    filename: 'Mapel.xlsx',
    description: 'Import daftar mata pelajaran.',
    columns: ['nama', 'kode', 'status'],
  },
  {
    type: 'schedules',
    title: 'Jadwal',
    filename: 'Jadwal.xlsx',
    description: 'Import jadwal tetap sebagai template DailyAgenda.',
    columns: [
      'tahun_ajaran',
      'semester',
      'kelas',
      'kode_mapel',
      'guru',
      'hari',
      'mulai',
      'selesai',
      'ruang',
      'status',
    ],
  },
];

export function ImportDataCenter() {
  const [stateByType, setStateByType] = useState<Record<string, LoadState>>({});
  const [summaryByType, setSummaryByType] = useState<Record<string, ImportSummary>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport(type: ImportType, file?: File) {
    if (!file) {
      setMessage('Pilih file .xlsx terlebih dahulu.');
      return;
    }

    setStateByType((currentState) => ({ ...currentState, [type]: 'loading' }));
    setMessage(null);

    try {
      const response = await api.importAcademicData(type, file);
      setSummaryByType((currentSummary) => ({
        ...currentSummary,
        [type]: response.data,
      }));
      setStateByType((currentState) => ({ ...currentState, [type]: 'success' }));
      setMessage(response.message ?? 'Import selesai.');
    } catch {
      setStateByType((currentState) => ({ ...currentState, [type]: 'error' }));
      setMessage('Import gagal. Periksa format file dan backend.');
    }
  }

  return (
    <section className="mt-10 space-y-5">
      {message ? (
        <p className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {importItems.map((item) => (
          <ImportCard
            item={item}
            key={item.type}
            onImport={handleImport}
            state={stateByType[item.type] ?? 'idle'}
            summary={summaryByType[item.type]}
          />
        ))}
      </div>
    </section>
  );
}

function ImportCard({
  item,
  onImport,
  state,
  summary,
}: {
  item: (typeof importItems)[number];
  onImport: (type: ImportType, file?: File) => Promise<void>;
  state: LoadState;
  summary?: ImportSummary;
}) {
  const [file, setFile] = useState<File | undefined>();
  const [showColumns, setShowColumns] = useState(false);

  return (
    <article className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            {item.filename}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{item.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
          XLSX
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">
              Format Kolom
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {item.columns.length} kolom diperlukan
            </p>
          </div>
          <button
            className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-sm"
            onClick={() => setShowColumns((current) => !current)}
            type="button"
          >
            {showColumns ? 'Tutup' : 'Lihat'}
          </button>
        </div>
        <div
          className={[
            'mt-3 flex flex-wrap gap-2',
            showColumns ? 'flex' : 'hidden sm:flex',
          ].join(' ')}
        >
          {item.columns.map((column) => (
            <span
              className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600"
              key={column}
            >
              {column}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm font-semibold text-slate-700">
          Pilih file Excel
          <input
            accept=".xlsx,.xls"
            className="w-full text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
            onChange={(event) => setFile(event.target.files?.[0])}
            type="file"
          />
          {file ? (
            <span className="truncate text-xs font-normal text-muted">
              {file.name}
            </span>
          ) : null}
        </label>
        <button
          className="rounded-2xl bg-brand-600 px-4 py-4 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state === 'loading'}
          onClick={() => void onImport(item.type, file)}
          type="button"
        >
          {state === 'loading' ? 'Mengimport...' : `Import ${item.title}`}
        </button>
      </div>

      {summary ? (
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <SummaryBox label="Total" value={summary.total} />
          <SummaryBox label="Created" value={summary.created} />
          <SummaryBox label="Updated" value={summary.updated} />
          <SummaryBox label="Skipped" value={summary.skipped} />
        </div>
      ) : null}

      {summary?.errors.length ? (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">Error rows</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {summary.errors.slice(0, 5).map((error) => (
              <li key={`${error.row}-${error.message}`}>
                Row {error.row}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center sm:text-left">
      <p className="text-xs text-muted">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
