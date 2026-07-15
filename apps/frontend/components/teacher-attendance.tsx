'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Attendance, type AttendanceStatus, type DailyAgenda } from '../lib/api';
import { AgendaCard } from './teacher-attendance/agenda-card';
import {
  AttendanceHeader,
  AttendanceListMode,
  AttendanceQuickMode,
  AttendanceSummary,
} from './teacher-attendance/attendance-editor-sections';
import {
  getChecklistLabel,
  getToday,
  type AttendanceMode,
} from './teacher-attendance/teacher-attendance-utils';
import { Button } from './ui/button';
import { SurfaceCard } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { useToast } from './ui/toast';

export function TeacherAttendance() {
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [agendas, setAgendas] = useState<DailyAgenda[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<AttendanceMode>('list');
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [checklist, setChecklist] = useState({
    teacherPresent: true,
    studentAttendanceDone: true,
    classPhotoDone: false,
    issueNotes: '',
    materialNotes: '',
  });

  async function load() {
    try {
      setAgendas((await api.getMyAgendas(getToday())).data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Agenda hari ini gagal dimuat.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function open(agenda: DailyAgenda) {
    try {
      const response = await api.openClass(agenda.id);
      setAttendance(response.data);
      setSelectedItemId(response.data.items[0]?.id ?? '');
      setChecklist({
        teacherPresent: true,
        studentAttendanceDone: true,
        classPhotoDone: Boolean(response.data.classPhotoName),
        issueNotes: '',
        materialNotes: response.data.notes ?? '',
      });
      setPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kelas gagal dibuka.');
    }
  }

  async function submit() {
    if (!attendance) return;

    if (!checklist.materialNotes.trim()) {
      toast.error('Materi/Catatan KBM wajib diisi sebelum presensi diselesaikan.');
      return;
    }

    setSaving(true);
    try {
      let current = attendance;

      if (photo) {
        const uploaded = (await api.uploadAttendanceClassPhoto(current.id, photo)).data;
        current = {
          ...current,
          ...uploaded,
          items: uploaded.items ?? current.items,
        };
      }

      await api.submitAttendance({
        attendanceId: current.id,
        notes: checklist.materialNotes.trim(),
        teacherPresent: checklist.teacherPresent,
        studentAttendanceDone: checklist.studentAttendanceDone,
        materialFilled: Boolean(checklist.materialNotes.trim()),
        classPhotoDone: checklist.classPhotoDone || Boolean(photo) || Boolean(current.classPhotoName),
        issueNotes: checklist.issueNotes || undefined,
        items: current.items.map((item) => ({
          attendanceItemId: item.id,
          status: item.status,
          notes: item.notes ?? undefined,
        })),
      });
      toast.success('Presensi tersimpan. Ringkasan kehadiran diproses untuk wali murid.');
      setAttendance(null);
      setPhoto(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Presensi gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  function update(id: string, status: AttendanceStatus) {
    setAttendance((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === id ? { ...item, status } : item,
            ),
          }
        : current,
    );
  }

  if (attendance) {
    const selectedItem = attendance.items.find((item) => item.id === selectedItemId) ?? attendance.items[0];
    const canSubmit = Boolean(
      !saving &&
      checklist.teacherPresent &&
      checklist.studentAttendanceDone &&
      checklist.classPhotoDone &&
      checklist.materialNotes.trim(),
    );

    return (
      <section className="mt-6 space-y-4">
        <AttendanceHeader
          classPhotoName={attendance.classPhotoName}
          onPickPhoto={() => cameraRef.current?.click()}
          photoName={photo?.name}
        />
        <input
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            setPhoto(event.target.files?.[0] ?? null);
            setChecklist((current) => ({ ...current, classPhotoDone: Boolean(event.target.files?.[0]) }));
          }}
          ref={cameraRef}
          type="file"
        />

        <SurfaceCard>
          <h3 className="text-base font-black">Checklist KBM</h3>
          <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3">
            {(['teacherPresent', 'studentAttendanceDone', 'classPhotoDone'] as const).map((key) => (
              <label
                className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 px-3 py-2"
                key={key}
              >
                <input
                  checked={checklist[key]}
                  className="size-4 accent-brand-600"
                  onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))}
                  type="checkbox"
                />
                {getChecklistLabel(key)}
              </label>
            ))}
          </div>
          <label className="mt-3 grid gap-2 text-sm font-bold">
            Materi/Catatan KBM
            <textarea
              className="min-h-24 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600"
              onChange={(event) =>
                setChecklist((current) => ({ ...current, materialNotes: event.target.value }))
              }
              placeholder="Contoh: Membahas operasi bilangan bulat dan latihan soal halaman 24."
              value={checklist.materialNotes}
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-bold">
            Catatan Kendala
            <textarea
              className="min-h-20 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600"
              onChange={(event) =>
                setChecklist((current) => ({ ...current, issueNotes: event.target.value }))
              }
              placeholder="Opsional: kendala kelas, perpindahan ruang, perangkat, atau catatan khusus."
              value={checklist.issueNotes}
            />
          </label>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-black">Presensi Siswa</h3>
              <p className="mt-1 text-sm text-muted">
                Default semua siswa Hadir. Pilih mode input yang paling nyaman.
              </p>
            </div>
            <div className="grid grid-cols-2 rounded-2xl border border-blue-100 bg-blue-50 p-1 text-xs font-black">
              <button
                className={`rounded-xl px-3 py-2 ${mode === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted'}`}
                onClick={() => setMode('list')}
                type="button"
              >
                List
              </button>
              <button
                className={`rounded-xl px-3 py-2 ${mode === 'quick' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted'}`}
                onClick={() => setMode('quick')}
                type="button"
              >
                Dropdown
              </button>
            </div>
          </div>

          {mode === 'list' ? (
            <AttendanceListMode
              attendance={attendance}
              page={page}
              onPageChange={setPage}
              onUpdate={update}
            />
          ) : (
            <AttendanceQuickMode
              attendance={attendance}
              selectedItemId={selectedItem?.id ?? ''}
              onSelect={setSelectedItemId}
              onUpdate={update}
            />
          )}

          <AttendanceSummary attendance={attendance} />

          <Button
            className="mt-4 w-full"
            disabled={!canSubmit}
            onClick={() => void submit()}
            variant="success"
          >
            {saving ? 'Menyimpan...' : 'Selesaikan Presensi'}
          </Button>
          {!canSubmit ? (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Lengkapi checklist wajib dan Materi/Catatan KBM. Catatan Kendala boleh kosong.
            </p>
          ) : null}
        </SurfaceCard>
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-3">
      {agendas.map((agenda) => (
        <AgendaCard agenda={agenda} key={agenda.id} onOpen={open} />
      ))}
      {!agendas.length ? (
        <EmptyState title="Tidak ada agenda mengajar hari ini." />
      ) : null}
    </section>
  );
}
