'use client';

type Teacher = { id: string; name: string; nip?: string | null };
type OrganizationClass = { id: string; name: string; teacherId?: string | null };

type HomeroomCardEditorProps = {
  selectedClass: OrganizationClass;
  teachers: Teacher[];
  onChange: (classId: string, teacherId: string) => void;
};

export function HomeroomCardEditor({ selectedClass, teachers, onChange }: HomeroomCardEditorProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <p className="font-bold text-amber-900 dark:text-amber-100">
        Edit Wali Kelas · {selectedClass.name}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={selectedClass.teacherId ?? ''}
          onChange={(event) => onChange(selectedClass.id, event.target.value)}
          className="min-h-10 rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Belum ditentukan</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}{teacher.nip ? ` · ${teacher.nip}` : ''}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Data guru, NIP, dan foto mengikuti profil guru.
        </span>
      </div>
    </div>
  );
}
