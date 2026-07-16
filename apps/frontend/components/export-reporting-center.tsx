'use client';

import { useState } from 'react';
import { api, type ReportFormat, type ReportType } from '../lib/api';

const reports: Array<{
  type: ReportType;
  title: string;
  description: string;
}> = [
  {
    type: 'attendance-summary',
    title: 'Rekap Kehadiran',
    description: 'Ringkasan hadir, sakit, izin, dan alpha per kelas/mapel.',
  },
  {
    type: 'teacher-teaching',
    title: 'Rekap Guru Mengajar',
    description: 'Daftar guru mengajar, kelas, mapel, dan status submit.',
  },
  {
    type: 'empty-classes',
    title: 'Kelas Kosong',
    description: 'Agenda kelas yang terdeteksi kosong.',
  },
  {
    type: 'student-attendance',
    title: 'Presensi Siswa',
    description: 'Detail presensi per siswa dan mata pelajaran.',
  },
];

export function ExportReportingCenter() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function download(type: ReportType, format: ReportFormat) {
    window.open(api.getReportExportUrl(type, format, date), '_blank');
  }

  return (
    <section className="mt-10 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:max-w-xs">
          Tanggal Laporan
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-brand-600"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <article
            className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm"
            key={report.type}
          >
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
              Export Report
            </p>
            <h2 className="mt-1 text-2xl font-bold">{report.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                onClick={() => download(report.type, 'excel')}
                type="button"
              >
                Excel
              </button>
              <button
                className="rounded-2xl border border-blue-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-blue-100"
                onClick={() => download(report.type, 'pdf')}
                type="button"
              >
                PDF
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
