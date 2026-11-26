export type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  photoUrl?: string | null;
  roles?: string[];
  telegramId?: string | null;
  telegramLinkedAt?: string | null;
  username?: string | null;
};

export function getRoleDisplayLabels(roles?: string[] | null) {
  const roleDisplayPriority: Record<string, number> = {
    super_admin: 0,
    operator_sekolah: 1,
    tu: 2,
  };

  return [...new Set(roles ?? [])]
    .filter(Boolean)
    .map((role) => {
      const normalizedRole = role.trim().toLowerCase();
      const label = normalizedRole === 'super_admin'
        ? 'Super Administrator'
        : role
            .replace(/_/g, ' ')
            .trim()
            .split(/\s+/)
            .map((part) => {
              const normalized = part.toLowerCase();
              if (normalized === 'tu' || normalized === 'bk') return normalized.toUpperCase();
              return part === part.toUpperCase()
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join(' ');

      return { normalizedRole, label };
    })
    .sort((a, b) => {
      const priorityA = roleDisplayPriority[a.normalizedRole] ?? Number.MAX_SAFE_INTEGER;
      const priorityB = roleDisplayPriority[b.normalizedRole] ?? Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB || a.label.localeCompare(b.label);
    })
    .map(({ label }) => label);
}

export function getRoleGreetingLabels(roles?: string[] | null) {
  return getRoleDisplayLabels(roles).map((label) => {
    if (label === 'Super Administrator') return 'Super Admin';
    if (label === 'Operator Sekolah') return 'Opsek';
    return label;
  });
}

export function getRoleGreeting(roles?: string[] | null) {
  const labels = getRoleGreetingLabels(roles);
  return labels.length ? ' (' + labels.join(', ') + ')' : '';
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error';
