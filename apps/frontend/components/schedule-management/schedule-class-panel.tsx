import {
  type DailyAgenda,
  type Schedule,
  type SchoolClass,
  type Teacher,
} from '../../lib/api';
import { Button } from '../ui/button';
import { DateControl } from './schedule-form-controls';
import { dayOptions, formatDateDisplay, getDayLabel } from './schedule-management-utils';

type AgendaCoverage = {
  expected: number;
  existing: number;
  missing: number;
  blockedDates: number;
} | null;

type ScheduleWithEffectiveRevision = Schedule & {
  hasRevision?: boolean;
};

type ScheduleClassPanelProps = {
  agendaClassIds: string[];
  agendaCoverage: AgendaCoverage;
  assignSubstitute: (agenda: DailyAgenda, teacherId: string) => void;
  canGenerateAgenda: boolean;
  checkAgendaCoverage: (classId?: string) => void;
  classesByGrade: Record<string, SchoolClass[]>;
  formSchoolYearId: string;
  generateEndsAt: string;
  generateStartsAt: string;
  generatedAgendas: DailyAgenda[];
  handleDelete: (schedule: Schedule) => void;
  handleGenerateAgendas: (payload: { classId?: string; classIds?: string[] }) => void;
  scheduleClassId: string;
  scheduleDayFilter: string;
  schedulesByClass: ScheduleWithEffectiveRevision[];
  weeklySchedulesByClass: ScheduleWithEffectiveRevision[];
  selectedScheduleClass?: SchoolClass;
  setGenerateEndsAt: (value: string) => void;
  setGenerateStartsAt: (value: string) => void;
  setScheduleClassId: (value: string) => void;
  setScheduleDayFilter: (value: string) => void;
  setViewDate: (value: string) => void;
  startEdit: (schedule: Schedule) => void;
  submitState: 'idle' | 'loading' | 'success' | 'error';
  teachers: Teacher[];
  viewDate: string;
};

export function ScheduleClassPanel({
  agendaClassIds,
  agendaCoverage,
  assignSubstitute,
  canGenerateAgenda,
  checkAgendaCoverage,
  classesByGrade,
  formSchoolYearId,
  generateEndsAt,
  generateStartsAt,
  generatedAgendas,
  handleDelete,
  handleGenerateAgendas,
  scheduleClassId,
  scheduleDayFilter,
  schedulesByClass,
  weeklySchedulesByClass,
  selectedScheduleClass,
  setGenerateEndsAt,
  setGenerateStartsAt,
  setScheduleClassId,
  setScheduleDayFilter,
  setViewDate,
  startEdit,
  submitState,
  teachers,
  viewDate,
}: ScheduleClassPanelProps) {
  const dailySummary = dayOptions.map((day) => ({ ...day, schedules: weeklySchedulesByClass.filter((schedule) => schedule.dayOfWeek === day.value) }));
  const scheduleDayGroups = dayOptions
    .map((day) => ({
      ...day,
      schedules: schedulesByClass.filter((schedule) => schedule.dayOfWeek === Number(day.value)),
    }))
    .filter((group) => group.schedules.length > 0);

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Jadwal Kelas
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-[var(--text)]">
              {selectedScheduleClass?.name ?? 'Pilih Kelas'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tabel ini menampilkan jadwal kelas sesuai tanggal kondisi yang dipilih.
            </p>
          </div>

          <div className="mt-0 space-y-3 xl:col-span-2">
            {Object.entries(classesByGrade).map(([grade, gradeClasses]) => (
              <div className="grid gap-2 sm:grid-cols-[4rem_1fr]" key={grade}>
                <p className="pt-2 text-xs font-black text-muted">Kelas {grade}</p>
                <div className="flex flex-wrap gap-2">
                  {gradeClasses.map((schoolClass) => {
                    const active = schoolClass.id === scheduleClassId;
                    return (
                      <button
                        className={[
                          'rounded-xl border px-3 py-2 text-xs font-black transition',
                          active
                            ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                            : 'border-blue-100 bg-blue-50/60 text-brand-700 hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100',
                        ].join(' ')}
                        key={schoolClass.id}
                        onClick={() => setScheduleClassId(schoolClass.id)}
                        type="button"
                      >
                        {schoolClass.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canGenerateAgenda ? (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <div className="mb-4">
              <p className="text-xs font-black tracking-[0.12em] text-emerald-700 uppercase">
                Generate Agenda
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-emerald-50/80">
                Buat agenda harian berdasarkan jadwal efektif pada setiap tanggal.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DateControl
                description="Tanggal pertama agenda yang akan dibuat."
                label="Generate mulai"
                onChange={setGenerateStartsAt}
                value={generateStartsAt}
              />
              <DateControl
                description="Tanggal terakhir agenda yang akan dibuat."
                label="Generate sampai"
                onChange={setGenerateEndsAt}
                value={generateEndsAt}
              />
            </div>
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Button
                className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                onClick={() => void checkAgendaCoverage(scheduleClassId || undefined)}
                variant="outline"
              >
                Cek Agenda Kelas
              </Button>
              <Button
                disabled={!scheduleClassId || !formSchoolYearId || submitState === 'loading'}
                onClick={() => void handleGenerateAgendas({ classId: scheduleClassId })}
                variant="success"
              >
                Generate Agenda Kelas
              </Button>
              <Button
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                disabled={!agendaClassIds.length || !formSchoolYearId || submitState === 'loading'}
                onClick={() => void handleGenerateAgendas({ classIds: agendaClassIds })}
                variant="outline"
              >
                Generate Semua Kelas VII-IX
              </Button>
            </div>
            {agendaCoverage ? (
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3 text-sm font-bold text-slate-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-50">
                Agenda tersedia: {agendaCoverage.existing}/{agendaCoverage.expected}. Belum dibuat: {agendaCoverage.missing}. Hari diblokir Kaldik: {agendaCoverage.blockedDates}.
              </div>
            ) : null}

        {selectedScheduleClass?.homeroomTeacher ? (
          <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-brand-700 dark:bg-blue-400/10 dark:text-blue-100">
            Wali kelas: {selectedScheduleClass.homeroomTeacher.name}
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-[var(--border)]">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-black text-slate-900 dark:text-[var(--text)]">Ringkasan Jadwal Mingguan</h3><span className="text-xs text-muted">{weeklySchedulesByClass.length} jadwal</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {dailySummary.map((day) => <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[var(--surface-soft)]" key={day.value}><p className="text-xs font-bold text-muted">{day.label}</p><p className="mt-1 text-lg font-black text-slate-900 dark:text-[var(--text)]">{day.schedules.length}</p><p className="text-[10px] text-muted">jadwal</p></div>)}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-[var(--text)]">Tampilan Jadwal</h3>
            <p className="mt-1 text-xs text-muted">Atur tanggal kondisi dan hari untuk jadwal kelas di bawah ini.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateControl
              description="Pilih tanggal untuk melihat jadwal yang berlaku."
              label="Jadwal berlaku per tanggal"
              onChange={setViewDate}
              value={viewDate}
            />
            <label className="grid content-start gap-1 text-sm font-semibold text-slate-700 dark:text-[var(--text-soft)]">
              Filter hari
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
                onChange={(event) => setScheduleDayFilter(event.target.value)}
                value={scheduleDayFilter}
              >
                <option value="all">Semua hari</option>
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {scheduleDayFilter === 'all' && scheduleClassId && schedulesByClass.length ? (
          <div className="mt-3 space-y-2">
            {scheduleDayGroups.map((group) => (
              <details
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-[var(--border)] dark:bg-[var(--surface-solid)]"
                key={group.value}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 dark:bg-[var(--surface-soft)] dark:text-[var(--text)]">
                  <span>{group.label}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-brand-700 dark:bg-slate-950 dark:text-blue-100">
                    {group.schedules.length} jadwal
                  </span>
                </summary>
                <ScheduleTable
                  handleDelete={handleDelete}
                  schedules={group.schedules}
                  startEdit={startEdit}
                />
              </details>
            ))}
          </div>
        ) : (
          <div className="mt-3 max-w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-[var(--border)]">
            <table className="w-full min-w-[560px] border-collapse bg-white text-left text-sm dark:bg-[var(--surface-solid)] sm:min-w-[720px]">
              <ScheduleTableHead />
              <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                <ScheduleRows
                  handleDelete={handleDelete}
                  schedules={schedulesByClass}
                  startEdit={startEdit}
                />

                {scheduleClassId && !schedulesByClass.length ? (
                  <tr>
                    <td className="px-4 py-5 text-sm font-semibold text-muted" colSpan={5}>
                      Belum ada jadwal untuk kelas dan hari yang dipilih.
                    </td>
                  </tr>
                ) : null}

                {!scheduleClassId ? (
                  <tr>
                    <td className="px-4 py-5 text-sm font-semibold text-muted" colSpan={5}>
                      Pilih kelas untuk melihat tabel jadwal.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}


          </div>
        ) : null}
      </div>

      {canGenerateAgenda && generatedAgendas.length ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
          <p>Agenda: <strong>{generatedAgendas.length}</strong> sesi untuk {formatDateDisplay(generateStartsAt)} sampai {formatDateDisplay(generateEndsAt)} sudah diproses.</p>
          <div className="mt-3 grid gap-2">
            {generatedAgendas.slice(0, 8).map((agenda) => (
              <div className="rounded-xl bg-white p-3 dark:bg-[var(--surface-solid)]" key={agenda.id}>
                <p className="font-black text-slate-800 dark:text-[var(--text)]">{agenda.class.name} · {agenda.subject.name}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {formatDateDisplay(agenda.date)} · Guru utama: {agenda.teacher.name}
                  {agenda.substituteTeacher ? ` · Pengganti: ${agenda.substituteTeacher.name}` : ''}
                </p>
                <select
                  className="mt-2 w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-bold text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
                  onChange={(event) => void assignSubstitute(agenda, event.target.value)}
                  value={agenda.substituteTeacher?.id ?? ''}
                >
                  <option value="">Tanpa guru pengganti</option>
                  {teachers.filter((teacher) => teacher.id !== agenda.teacher.id).map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleTable({
  handleDelete,
  schedules,
  startEdit,
}: {
  handleDelete: (schedule: Schedule) => void;
  schedules: ScheduleWithEffectiveRevision[];
  startEdit: (schedule: Schedule) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse bg-white text-left text-sm dark:bg-[var(--surface-solid)] sm:min-w-[720px]">
        <ScheduleTableHead />
        <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
          <ScheduleRows handleDelete={handleDelete} schedules={schedules} startEdit={startEdit} />
        </tbody>
      </table>
    </div>
  );
}

function ScheduleTableHead() {
  return (
    <thead className="bg-slate-50 text-xs font-black tracking-[0.08em] text-slate-500 uppercase dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
      <tr>
        <th className="px-4 py-3">Hari</th>
        <th className="px-4 py-3">Jam</th>
        <th className="px-4 py-3">Mata Pelajaran</th>
        <th className="px-4 py-3">Guru</th>
        <th className="px-4 py-3">Aksi</th>
      </tr>
    </thead>
  );
}

function ScheduleRows({
  handleDelete,
  schedules,
  startEdit,
}: {
  handleDelete: (schedule: Schedule) => void;
  schedules: ScheduleWithEffectiveRevision[];
  startEdit: (schedule: Schedule) => void;
}) {
  return (
    <>
      {schedules.map((schedule) => (
        <tr key={schedule.id}>
          <td className="px-4 py-3 font-black text-slate-800 dark:text-[var(--text)]">
            {getDayLabel(schedule.dayOfWeek)}
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-[var(--text-soft)]">
            {schedule.startsAt}-{schedule.endsAt}
          </td>
          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-[var(--text)]">
            {schedule.subject.name}
            {schedule.hasRevision ? <span className="ml-2 text-xs text-amber-700">Revisi</span> : null}
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-[var(--text-soft)]">
            {schedule.teacher.name}
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Button onClick={() => startEdit(schedule)} size="sm" variant="outline">
                Edit
              </Button>
              <Button
                onClick={() => void handleDelete(schedule)}
                size="sm"
                variant="danger"
              >
                Hapus
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
