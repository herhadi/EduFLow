import { type ReactNode } from 'react';
import { type AcademicTimeSlot, type SchoolYear } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { fieldClass, FormField } from '../ui/form';
import { timeSlotTypeOptions } from './academic-master-constants';

type TimeSlotsByDay = Array<{
  value: number;
  label: string;
  slots: AcademicTimeSlot[];
}>;

type TimeSlotManagementPanelProps = {
  editingTimeSlotId: string;
  isAddingTimeSlot: boolean;
  onDeleteTimeSlot: (slot: AcademicTimeSlot) => void;
  onSchoolYearChange: (schoolYearId: string) => void;
  onStartAdd: () => void;
  onStartEdit: (slot: AcademicTimeSlot) => void;
  renderTimeSlotForm: (submitLabel: string) => ReactNode;
  schoolYears: SchoolYear[];
  selectedSchoolYearId: string;
  timeSlotsByDay: TimeSlotsByDay;
};

export function TimeSlotManagementPanel({
  editingTimeSlotId,
  isAddingTimeSlot,
  onDeleteTimeSlot,
  onSchoolYearChange,
  onStartAdd,
  onStartEdit,
  renderTimeSlotForm,
  schoolYears,
  selectedSchoolYearId,
  timeSlotsByDay,
}: TimeSlotManagementPanelProps) {
  return (
    <Card className="min-w-0 sm:p-6">
      <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Jadwal Sekolah</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Jam Pelajaran</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Atur susunan jam per hari untuk setiap tahun ajaran. Di sinilah operator mengubah jam mulai, jam selesai, nomor jam, dan jenis slot seperti istirahat atau upacara.
      </p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <FormField htmlFor="time-slot-school-year-filter" label="Tahun Ajaran">
          <select
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-school-year-filter"
            onChange={(event) => onSchoolYearChange(event.target.value)}
            value={selectedSchoolYearId}
          >
            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
        </FormField>
        <Button disabled={!selectedSchoolYearId} onClick={onStartAdd}>
          Tambah Jam Pelajaran
        </Button>
      </div>

      {isAddingTimeSlot ? (
        <div className="mt-3">
          {renderTimeSlotForm('Tambah Jam Pelajaran')}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {timeSlotsByDay.map((day) => (
          <div className="rounded-2xl border border-blue-50 bg-slate-50 p-4" key={day.value}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-900">{day.label}</h3>
              <Badge className="bg-white" tone="brand">{day.slots.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {day.slots.map((slot) => (
                <div
                  className={`rounded-xl bg-white p-3 ${editingTimeSlotId === slot.id ? 'ring-2 ring-brand-200' : ''}`}
                  key={slot.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {slot.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted">
                        {slot.startsAt}-{slot.endsAt}
                        {slot.periodNumber ? ` · Jam ${slot.periodNumber}` : ''}
                        {' · '}
                        {timeSlotTypeOptions.find((option) => option.value === slot.type)?.label ?? slot.type}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-brand-700">
                        {slot.isAssignable ? 'Dipakai untuk jadwal' : 'Slot non-pelajaran'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button onClick={() => onStartEdit(slot)} size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button
                        className="border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:text-red-800"
                        onClick={() => void onDeleteTimeSlot(slot)}
                        size="sm"
                        variant="outline"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  {editingTimeSlotId === slot.id ? (
                    <div className="mt-3 border-t border-blue-50 pt-3">
                      {renderTimeSlotForm('Simpan Perubahan Jam')}
                    </div>
                  ) : null}
                </div>
              ))}
              {!day.slots.length ? (
                <EmptyState className="bg-white py-3 text-xs" title="Belum ada slot waktu." />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
