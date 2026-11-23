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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">Kelas Binaan Wali Kelas</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Pilih kelas untuk menetapkan atau mengganti wali kelas. Kelas yang sudah memiliki wali kelas lain tidak dapat dipilih.
          </p>
        </div>
        {selectedHomeroomClassIds.length ? (
          <button className="rounded-full border border-red-700 bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500" onClick={onClearHomeroomClasses} type="button">
            Kosongkan wali kelas
          </button>
        ) : null}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            <tr><th className="w-1/3 px-3 py-2">Kelas</th><th className="px-3 py-2">Wali Kelas</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {classes.map((schoolClass) => {
              const active = selectedHomeroomClassIds.includes(schoolClass.id);
              const assignedToOtherTeacher = schoolClass.homeroomTeacherId && schoolClass.homeroomTeacherId !== selectedTeacher.id;
              const homeroomName = schoolClass.homeroomTeacher?.name ?? '-';
              return (
                <tr className={active ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-white dark:bg-slate-950'} key={schoolClass.id}>
                  <td className="px-3 py-1.5">
                    <button
                      className={[
                        'font-bold underline-offset-2 transition',
                        active ? 'text-amber-700 underline dark:text-amber-300' :
                          assignedToOtherTeacher ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' :
                            'text-slate-700 hover:text-brand-700 hover:underline dark:text-slate-200 dark:hover:text-blue-300',
                      ].join(' ')}
                      disabled={Boolean(assignedToOtherTeacher)}
                      onClick={() => onToggleHomeroomClass(schoolClass.id)}
                      type="button"
                    >
                      {schoolClass.name}{active ? ' · dipilih' : ''}
                    </button>
                  </td>
                  <td className={homeroomName === "-" ? "px-3 py-1.5 text-slate-400 dark:text-slate-500" : "px-3 py-1.5 text-slate-700 dark:text-slate-200"}>
                    {homeroomName}
                  </td>
                </tr>
              );
            })}
            {!classes.length ? (
              <tr><td className="px-3 py-3 text-center text-muted" colSpan={2}>
                Data kelas belum tersedia atau belum berhasil dimuat. Cek halaman akademik, lalu refresh halaman ini.
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
