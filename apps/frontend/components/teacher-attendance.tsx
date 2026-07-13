'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Attendance, type AttendanceStatus, type DailyAgenda } from '../lib/api';
import { CameraCaptureButton } from './ui/camera-capture-button';
import { Pagination } from './ui/pagination';
import { useToast } from './ui/toast';

const statuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'SICK', label: 'Sakit' },
  { value: 'EXCUSED', label: 'Izin' },
  { value: 'ABSENT', label: 'Alpha' },
];
const pageSize = 10;

type AttendanceMode = 'list' | 'quick';

const today = () => new Date().toISOString().slice(0, 10);

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
      setAgendas((await api.getMyAgendas(today())).data);
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
        current = (await api.uploadAttendanceClassPhoto(current.id, photo)).data;
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
            items: current.items.map((item) => item.id === id ? { ...item, status } : item),
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

        <section className="surface-card rounded-[2rem] p-5">
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
              onChange={(event) => setChecklist((current) => ({ ...current, materialNotes: event.target.value }))}
              placeholder="Contoh: Membahas operasi bilangan bulat dan latihan soal halaman 24."
              value={checklist.materialNotes}
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-bold">
            Catatan Kendala
            <textarea
              className="min-h-20 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600"
              onChange={(event) => setChecklist((current) => ({ ...current, issueNotes: event.target.value }))}
              placeholder="Opsional: kendala kelas, perpindahan ruang, perangkat, atau catatan khusus."
              value={checklist.issueNotes}
            />
          </label>
        </section>

        <section className="surface-card rounded-[2rem] p-4 sm:p-5">
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
            <AttendanceListMode attendance={attendance} page={page} onPageChange={setPage} onUpdate={update} />
          ) : (
            <AttendanceQuickMode
              attendance={attendance}
              selectedItemId={selectedItem?.id ?? ''}
              onSelect={setSelectedItemId}
              onUpdate={update}
            />
          )}

          <AttendanceSummary attendance={attendance} />

          <button
            className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            disabled={!canSubmit}
            onClick={() => void submit()}
            type="button"
          >
            {saving ? 'Menyimpan...' : 'Selesaikan Presensi'}
          </button>
          {!canSubmit ? (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Lengkapi checklist wajib dan Materi/Catatan KBM. Catatan Kendala boleh kosong.
            </p>
          ) : null}
        </section>
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-3">
      {agendas.map((agenda) => (
        <AgendaCard agenda={agenda} key={agenda.id} onOpen={open} />
      ))}
      {!agendas.length ? (
        <p className="surface-card rounded-2xl p-5 text-sm text-muted">
          Tidak ada agenda mengajar hari ini.
        </p>
      ) : null}
    </section>
  );
}

function AgendaCard({
  agenda,
  onOpen,
}: {
  agenda: DailyAgenda;
  onOpen: (agenda: DailyAgenda) => void;
}) {
  const isSubmitted =
    agenda.status === 'COMPLETED' ||
    Boolean(agenda.attendance?.submittedAt) ||
    ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'].includes(agenda.attendance?.state ?? '');

  return (
        <article
          className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[2rem] p-5"
        >
          <div>
            <p className="text-xs font-black text-brand-700">
              {agenda.schedule?.startsAt ?? 'Jam belum diatur'} · {agenda.class.name}
            </p>
            <h2 className="mt-1 text-lg font-black">{agenda.subject.name}</h2>
            {agenda.substituteTeacher ? (
              <p className="mt-1 text-xs font-black text-amber-700">
                Guru pengganti: {agenda.substituteTeacher.name}
              </p>
            ) : null}
            {isSubmitted ? (
              <p className="mt-2 w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Presensi sudah selesai
              </p>
            ) : null}
          </div>
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            disabled={isSubmitted}
            onClick={() => void onOpen(agenda)}
            type="button"
          >
            {isSubmitted ? 'Sudah Submit' : 'Buka Presensi'}
          </button>
        </article>
  );
}

function AttendanceHeader({
  classPhotoName,
  onPickPhoto,
  photoName,
}: {
  classPhotoName?: string | null;
  onPickPhoto: () => void;
  photoName?: string;
}) {
  return (
    <div className="surface-card rounded-[2rem] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Presensi Siswa</h2>
          <p className="mt-1 text-sm text-muted">
            Isi catatan materi, cek kehadiran siswa, lalu submit presensi.
          </p>
          {photoName || classPhotoName ? (
            <p className="mt-2 text-xs font-bold text-muted">
              Foto: {photoName ?? classPhotoName}
            </p>
          ) : null}
        </div>
        <CameraCaptureButton onClick={onPickPhoto}>Foto Kelas</CameraCaptureButton>
      </div>
    </div>
  );
}

function AttendanceListMode({
  attendance,
  onPageChange,
  onUpdate,
  page,
}: {
  attendance: Attendance;
  onPageChange: (page: number) => void;
  onUpdate: (id: string, status: AttendanceStatus) => void;
  page: number;
}) {
  const totalPages = Math.max(Math.ceil(attendance.items.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const visibleItems = attendance.items.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (page !== safePage) {
      onPageChange(safePage);
    }
  }, [onPageChange, page, safePage]);

  return (
    <>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {visibleItems.map((item) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3"
            key={item.id}
          >
            <p className="min-w-0 truncate text-sm font-bold">{item.student.name}</p>
            <select
              className="min-w-0 rounded-xl border px-3 py-2 text-sm"
              onChange={(event) => onUpdate(item.id, event.target.value as AttendanceStatus)}
              value={item.status}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Pagination
        onPageChange={onPageChange}
        page={safePage}
        pageSize={pageSize}
        totalItems={attendance.items.length}
      />
    </>
  );
}

function AttendanceQuickMode({
  attendance,
  onSelect,
  onUpdate,
  selectedItemId,
}: {
  attendance: Attendance;
  onSelect: (id: string) => void;
  onUpdate: (id: string, status: AttendanceStatus) => void;
  selectedItemId: string;
}) {
  const selectedItem = attendance.items.find((item) => item.id === selectedItemId) ?? attendance.items[0];

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <label className="grid gap-2 text-sm font-bold">
        Pilih Siswa
        <select
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600"
          onChange={(event) => onSelect(event.target.value)}
          value={selectedItem?.id ?? ''}
        >
          {attendance.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.student.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Status
        <select
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600"
          disabled={!selectedItem}
          onChange={(event) => selectedItem && onUpdate(selectedItem.id, event.target.value as AttendanceStatus)}
          value={selectedItem?.status ?? 'PRESENT'}
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function AttendanceSummary({ attendance }: { attendance: Attendance }) {
  const summary = useMemo(() => {
    return attendance.items.reduce<Record<AttendanceStatus, number>>(
      (result, item) => {
        result[item.status] += 1;
        return result;
      },
      { PRESENT: 0, SICK: 0, EXCUSED: 0, ABSENT: 0 },
    );
  }, [attendance.items]);

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {statuses.map((status) => (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-center" key={status.value}>
          <p className="text-lg font-black text-slate-900">{summary[status.value]}</p>
          <p className="text-[11px] font-black text-muted">{status.label}</p>
        </div>
      ))}
    </div>
  );
}

function getChecklistLabel(key: 'teacherPresent' | 'studentAttendanceDone' | 'classPhotoDone') {
  const labels = {
    teacherPresent: 'Guru hadir',
    studentAttendanceDone: 'Presensi siswa selesai',
    classPhotoDone: 'Foto kelas tersedia',
  };
  return labels[key];
}
