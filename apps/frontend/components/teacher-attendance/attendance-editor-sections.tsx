import { useEffect, useMemo } from 'react';
import { type Attendance, type AttendanceStatus } from '../../lib/api';
import { CameraCaptureButton } from '../ui/camera-capture-button';
import { Pagination } from '../ui/pagination';
import {
  attendanceStatuses,
  teacherAttendancePageSize,
} from './teacher-attendance-utils';

export function AttendanceHeader({
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

export function AttendanceListMode({
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
  const totalPages = Math.max(Math.ceil(attendance.items.length / teacherAttendancePageSize), 1);
  const safePage = Math.min(page, totalPages);
  const visibleItems = attendance.items.slice(
    (safePage - 1) * teacherAttendancePageSize,
    safePage * teacherAttendancePageSize,
  );

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
            className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]"
            key={item.id}
          >
            <p className="min-w-0 truncate text-sm font-bold">{item.student.name}</p>
            <select
              className="min-w-0 rounded-xl border px-3 py-2 text-sm dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
              onChange={(event) => onUpdate(item.id, event.target.value as AttendanceStatus)}
              value={item.status}
            >
              {attendanceStatuses.map((status) => (
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
        pageSize={teacherAttendancePageSize}
        totalItems={attendance.items.length}
      />
    </>
  );
}

export function AttendanceQuickMode({
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
    <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-400/20 dark:bg-blue-400/10 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <label className="grid gap-2 text-sm font-bold">
        Pilih Siswa
        <select
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]"
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
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]"
          disabled={!selectedItem}
          onChange={(event) => selectedItem && onUpdate(selectedItem.id, event.target.value as AttendanceStatus)}
          value={selectedItem?.status ?? 'PRESENT'}
        >
          {attendanceStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function AttendanceSummary({ attendance }: { attendance: Attendance }) {
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
      {attendanceStatuses.map((status) => (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-center dark:border-[var(--border)] dark:bg-[var(--surface-soft)]" key={status.value}>
          <p className="text-lg font-black text-slate-900 dark:text-[var(--text)]">{summary[status.value]}</p>
          <p className="text-[11px] font-black text-muted">{status.label}</p>
        </div>
      ))}
    </div>
  );
}
