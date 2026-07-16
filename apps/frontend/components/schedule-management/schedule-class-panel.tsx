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
  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Jadwal Kelas
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {selectedScheduleClass?.name ?? 'Pilih Kelas'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tabel ini menampilkan jadwal kelas sesuai tanggal kondisi yang dipilih.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="max-w-sm">
              <DateControl
                description="Melihat jadwal yang berlaku pada tanggal ini."
                label="Lihat kondisi jadwal"
                onChange={setViewDate}
                value={viewDate}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
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
                            : 'border-blue-100 bg-blue-50/60 text-brand-700 hover:bg-blue-100',
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

        {selectedScheduleClass?.homeroomTeacher ? (
          <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-brand-700">
            Wali kelas: {selectedScheduleClass.homeroomTeacher.name}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <label className="grid w-full gap-1 text-sm font-semibold text-slate-700 sm:w-56">
            Filter hari
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-600"
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

        <div className="mt-3 max-w-full overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[560px] border-collapse bg-white text-left text-sm sm:min-w-[720px]">
            <thead className="bg-slate-50 text-xs font-black tracking-[0.08em] text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Hari</th>
                <th className="px-4 py-3">Jam</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-4 py-3">Guru</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedulesByClass.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-4 py-3 font-black text-slate-800">
                    {getDayLabel(schedule.dayOfWeek)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {schedule.startsAt}-{schedule.endsAt}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {schedule.subject.name}
                    {schedule.hasRevision ? <span className="ml-2 text-xs text-amber-700">Revisi</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{schedule.teacher.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => startEdit(schedule)} size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button
                        className="border-red-100 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                        onClick={() => void handleDelete(schedule)}
                        size="sm"
                        variant="outline"
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

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

        {canGenerateAgenda ? (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="mb-4">
              <p className="text-xs font-black tracking-[0.12em] text-emerald-700 uppercase">
                Generate Agenda
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
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
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3 text-sm font-bold text-slate-700">
                Agenda tersedia: {agendaCoverage.existing}/{agendaCoverage.expected}. Belum dibuat: {agendaCoverage.missing}. Hari diblokir Kaldik: {agendaCoverage.blockedDates}.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {canGenerateAgenda && generatedAgendas.length ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-700">
          <p>Agenda: <strong>{generatedAgendas.length}</strong> sesi untuk {formatDateDisplay(generateStartsAt)} sampai {formatDateDisplay(generateEndsAt)} sudah diproses.</p>
          <div className="mt-3 grid gap-2">
            {generatedAgendas.slice(0, 8).map((agenda) => (
              <div className="rounded-xl bg-white p-3" key={agenda.id}>
                <p className="font-black text-slate-800">{agenda.class.name} · {agenda.subject.name}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {formatDateDisplay(agenda.date)} · Guru utama: {agenda.teacher.name}
                  {agenda.substituteTeacher ? ` · Pengganti: ${agenda.substituteTeacher.name}` : ''}
                </p>
                <select
                  className="mt-2 w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-bold text-slate-700"
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
