import { assignableRoles } from './teacher-role-management-utils';

type TeacherAccountRolePanelProps = {
  onToggleRole: (role: string) => void;
  selectedRoles: string[];
};

export function TeacherAccountRolePanel({
  onToggleRole,
  selectedRoles,
}: TeacherAccountRolePanelProps) {
  return (
    <div>
      <p className="text-sm font-black text-slate-800">Role Akun</p>
      <p className="mt-1 text-xs font-semibold text-muted">
        Jika memilih Wali Kelas, role Guru otomatis ikut karena wali kelas pasti guru mapel.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {assignableRoles.map((role) => {
          const active = selectedRoles.includes(role.value);

          return (
            <button
              className={[
                'rounded-full border px-3 py-2 text-xs font-black transition',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-blue-100 bg-white text-brand-700 hover:bg-brand-50',
              ].join(' ')}
              key={role.value}
              onClick={() => onToggleRole(role.value)}
              type="button"
            >
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
