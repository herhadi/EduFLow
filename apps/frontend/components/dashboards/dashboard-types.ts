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

export function getRoleGreeting(roles?: string[] | null) {
  const labels = (roles ?? []).map((role) => role.replaceAll('_', ' ')).filter(Boolean);
  return labels.length ? ' (' + labels.join(', ') + ')' : '';
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error';
