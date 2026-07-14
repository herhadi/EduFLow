import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { type AcademicTimeSlotType } from '../../lib/api';
import { Button } from '../ui/button';
import { fieldClass, FormField } from '../ui/form';
import {
  type AcademicTimeSlotFormState,
  timeSlotTypeOptions,
  weekdayOptions,
} from './academic-master-constants';

type AcademicTimeSlotFormProps = {
  form: AcademicTimeSlotFormState;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: Dispatch<SetStateAction<AcademicTimeSlotFormState>>;
  submitLabel: string;
};

export function AcademicTimeSlotForm({
  form,
  isSaving,
  onCancel,
  onSubmit,
  setForm,
  submitLabel,
}: AcademicTimeSlotFormProps) {
  return (
    <form className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-[0.85fr_0.65fr_1fr]">
        <FormField htmlFor="time-slot-day" label="Hari">
          <select
            className={`${fieldClass} border-blue-100 font-bold`}
            disabled={form.type === 'CEREMONY'}
            id="time-slot-day"
            onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
            value={form.dayOfWeek}
          >
            {weekdayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField htmlFor="time-slot-period" label="Jam ke-">
          <input
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-period"
            min="1"
            onChange={(event) => setForm((current) => ({ ...current, periodNumber: event.target.value }))}
            placeholder="Contoh 2"
            type="number"
            value={form.periodNumber}
          />
        </FormField>

        <FormField htmlFor="time-slot-type" label="Jenis Slot">
          <select
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-type"
            onChange={(event) => {
              const type = event.target.value as AcademicTimeSlotType;
              setForm((current) => ({
                ...current,
                dayOfWeek: type === 'CEREMONY' ? 1 : current.dayOfWeek,
                type,
                isAssignable: type === 'LESSON' ? current.isAssignable : false,
              }));
            }}
            value={form.type}
          >
            {timeSlotTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_0.7fr]">
        <FormField htmlFor="time-slot-name" label="Nama Slot">
          <input
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Contoh Jam 2"
            value={form.name}
          />
        </FormField>

        <FormField htmlFor="time-slot-start" label="Mulai">
          <input
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-start"
            onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
            type="time"
            value={form.startsAt}
          />
        </FormField>

        <FormField htmlFor="time-slot-end" label="Selesai">
          <input
            className={`${fieldClass} border-blue-100 font-bold`}
            id="time-slot-end"
            onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
            type="time"
            value={form.endsAt}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-700">
        <input
          checked={form.isAssignable}
          className="h-4 w-4 accent-brand-600"
          disabled={form.type !== 'LESSON'}
          onChange={(event) => setForm((current) => ({ ...current, isAssignable: event.target.checked }))}
          type="checkbox"
        />
        Slot ini bisa dipakai untuk penjadwalan pelajaran
      </label>

      {form.type === 'CEREMONY' ? (
        <p className="text-xs font-semibold text-brand-700">
          Slot Upacara dikunci pada hari Senin.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSaving} type="submit">
          {submitLabel}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Batal
        </Button>
      </div>
    </form>
  );
}
