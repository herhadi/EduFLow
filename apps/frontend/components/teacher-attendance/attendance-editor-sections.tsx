import { useEffect, useMemo, useState } from 'react';
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
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
  const [studentSearch, setStudentSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = attendance.items.find((item) => item.id === selectedItemId) ?? attendance.items[0];
  const filteredItems = attendance.items.filter((item) =>
    item.student.name.toLocaleLowerCase('id-ID').includes(studentSearch.trim().toLocaleLowerCase('id-ID')),
  );

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-400/20 dark:bg-blue-400/10 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="relative grid content-start gap-2 text-sm font-bold">
        <label className="grid gap-2" htmlFor="attendance-student-search">Pilih Siswa</label>
        <input
          aria-expanded={isOpen}
          aria-controls="attendance-student-options"
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none placeholder:text-slate-400 focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]"
          id="attendance-student-search"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => { setStudentSearch(event.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Enter' && filteredItems[0]) {
              event.preventDefault();
              onSelect(filteredItems[0].id);
              setStudentSearch('');
              setIsOpen(false);
            }
          }}
          placeholder={selectedItem?.student.name ?? 'Cari nama siswa...'}
          role="combobox"
          type="search"
          value={studentSearch}
        />
        {isOpen ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface-solid)]" id="attendance-student-options" role="listbox">
            {filteredItems.length ? filteredItems.map((item) => (
              <button
                aria-selected={item.id === selectedItem?.id}
                className={'block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-blue-50 dark:hover:bg-blue-400/10 ' + (item.id === selectedItem?.id ? 'bg-blue-50 text-brand-700 dark:bg-blue-400/10 dark:text-blue-100' : 'text-slate-800 dark:text-[var(--text)]')}
                key={item.id}
                onClick={() => { onSelect(item.id); setStudentSearch(''); setIsOpen(false); }}
                role="option"
                type="button"
              >
                {item.student.name}
              </button>
            )) : <p className="px-3 py-3 text-sm font-medium text-muted">Tidak ada siswa yang cocok.</p>}
          </div>
        ) : null}
        <span className="text-xs font-medium text-muted">{filteredItems.length} dari {attendance.items.length} siswa cocok</span>
      </div>
      <label className="grid content-start gap-2 text-sm font-bold">
        Status
        <select
          className="min-w-0 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]"
          disabled={!selectedItem}
          onChange={(event) => selectedItem && onUpdate(selectedItem.id, event.target.value as AttendanceStatus)}
          value={selectedItem?.status ?? 'PRESENT'}
        >
          {attendanceStatuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
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
