import {
  type SchoolClass,
  type Teacher,
} from '../../lib/api';

type TeacherHomeroomPanelProps = {
  classes: SchoolClass[];
  onClearHomeroomClasses: () => void;
  onToggleHomeroomClass: (classId: string) => void;
  selectedHomeroomClassIds: string[];
  selectedTeacher: Teacher;
};

export function TeacherHomeroomPanel({
  classes,
  onClearHomeroomClasses,
  onToggleHomeroomClass,
  selectedHomeroomClassIds,
  selectedTeacher,
}: TeacherHomeroomPanelProps) {
  return (
    <div>
      <p className="text-sm font-black text-slate-800">Kelas Binaan Wali Kelas</p>
      <p className="mt-1 text-xs font-semibold text-muted">
        Klik kelas aktif untuk mengosongkan/default. Pilih kelas lain untuk mengganti sebelum simpan.
      </p>
      {selectedHomeroomClassIds.length ? (
        <button
          className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800"
          onClick={onClearHomeroomClasses}
          type="button"
        >
          Kosongkan wali kelas
        </button>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {classes.map((schoolClass) => {
          const active = selectedHomeroomClassIds.includes(schoolClass.id);
          const assignedToOtherTeacher =
            schoolClass.homeroomTeacherId &&
            schoolClass.homeroomTeacherId !== selectedTeacher.id;

          return (
            <button
              className={[
                'rounded-full border px-3 py-2 text-xs font-black transition',
                active
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : assignedToOtherTeacher
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-blue-100 bg-white text-slate-700 hover:bg-brand-50',
              ].join(' ')}
              disabled={Boolean(assignedToOtherTeacher)}
              key={schoolClass.id}
              onClick={() => onToggleHomeroomClass(schoolClass.id)}
              type="button"
            >
              {schoolClass.name}
              {active ? ' · aktif, klik untuk kosongkan' : ''}
              {assignedToOtherTeacher
                ? ` · ${schoolClass.homeroomTeacher?.name ?? 'sudah ada wali'}`
                : ''}
            </button>
          );
        })}

        {!classes.length ? (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">
            Data kelas belum tersedia atau belum berhasil dimuat. Cek halaman `/admin/akademik` untuk memastikan kelas sudah ada, lalu refresh halaman ini.
          </div>
        ) : null}
      </div>
    </div>
  );
}
