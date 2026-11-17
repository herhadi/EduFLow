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
  return [...new Set(roles ?? [])]
    .filter(Boolean)
    .map((role) =>
      role
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
        .join(' '),
    )
    .sort((a, b) => a.localeCompare(b));
}

export function getRoleGreeting(roles?: string[] | null) {
  const labels = getRoleDisplayLabels(roles);
  return labels.length ? ' (' + labels.join(', ') + ')' : '';
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error';
