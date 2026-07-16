'use client';

import { useState } from 'react';
import { api, type ReportFormat, type ReportType } from '../lib/api';
import { Button } from './ui/button';
import { SurfaceCard } from './ui/card';
import { fieldClass, FormField } from './ui/form';

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
      <SurfaceCard>
        <FormField className="sm:max-w-xs" label="Tanggal Laporan">
          <input
            className={`${fieldClass} font-normal`}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </FormField>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <SurfaceCard key={report.type}>
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
              Export Report
            </p>
            <h2 className="mt-1 text-2xl font-bold">{report.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                onClick={() => download(report.type, 'excel')}
              >
                Excel
              </Button>
              <Button
                onClick={() => download(report.type, 'pdf')}
                variant="outline"
              >
                PDF
              </Button>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
