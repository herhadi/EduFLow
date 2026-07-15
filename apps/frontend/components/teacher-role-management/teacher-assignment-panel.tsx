import {
  type SchoolYear,
  type Subject,
  type TeacherAssignmentStatus,
} from '../../lib/api';

type TeacherAssignmentPanelProps = {
  assignmentNotes: string;
  assignmentSchoolYearId: string;
  assignmentStatus: TeacherAssignmentStatus;
  assignmentSubjectIds: string[];
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSchoolYearChange: (value: string) => void;
  onStatusChange: (value: TeacherAssignmentStatus) => void;
  onToggleSubject: (subjectId: string) => void;
  schoolYears: SchoolYear[];
  subjects: Subject[];
};

export function TeacherAssignmentPanel({
  assignmentNotes,
  assignmentSchoolYearId,
  assignmentStatus,
  assignmentSubjectIds,
  onNotesChange,
  onSave,
  onSchoolYearChange,
  onStatusChange,
  onToggleSubject,
  schoolYears,
  subjects,
}: TeacherAssignmentPanelProps) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <p className="text-sm font-black text-emerald-900">Riwayat Penugasan Tahun Ajaran</p>
      <p className="mt-1 text-xs font-semibold text-emerald-800">
        Menjadi acuan utama untuk jadwal tahun ajaran yang dipilih.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Tahun ajaran
          <select
            className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600"
            onChange={(event) => onSchoolYearChange(event.target.value)}
            value={assignmentSchoolYearId}
          >
            {schoolYears.map((schoolYear) => (
              <option key={schoolYear.id} value={schoolYear.id}>{schoolYear.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Status penugasan
          <select
            className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600"
            onChange={(event) => onStatusChange(event.target.value as TeacherAssignmentStatus)}
            value={assignmentStatus}
          >
            <option value="ACTIVE">Aktif mengajar</option>
            <option value="ON_LEAVE">Cuti</option>
            <option value="TRANSFERRED">Pindah sekolah</option>
            <option value="RETIRED">Pensiun</option>
            <option value="INACTIVE">Tidak ditugaskan</option>
          </select>
        </label>
      </div>
      <p className="mt-4 text-xs font-black text-slate-700">Mapel ampu pada tahun ajaran ini</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {subjects.map((subject) => {
          const active = assignmentSubjectIds.includes(subject.id);
          return (
            <button
              className={[
                'rounded-full border px-3 py-2 text-xs font-black transition',
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-100',
              ].join(' ')}
              key={subject.id}
              onClick={() => onToggleSubject(subject.id)}
              type="button"
            >
              {subject.name}
            </button>
          );
        })}
      </div>
      <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
        Catatan riwayat
        <input
          className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600"
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Contoh: pensiun per 1 Juli 2027"
          value={assignmentNotes}
        />
      </label>
      <button
        className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
        disabled={!assignmentSchoolYearId}
        onClick={() => void onSave()}
        type="button"
      >
        Simpan Penugasan Tahun Ajaran
      </button>
    </div>
  );
}
