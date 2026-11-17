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

const roleDisplayLabels: Record<string, string> = {
  admin: 'Super Admin',
  bk: 'BK',
  guru: 'Guru',
  kepala_sekolah: 'Kepala Sekolah',
  operator_sekolah: 'Operator Sekolah',
  orang_tua: 'Orang Tua',
  root: 'Root',
  tu: 'TU',
  wali_kelas: 'Wali Kelas',
};

const rolePriority: Record<string, number> = {
  root: 0,
  admin: 1,
  kepala_sekolah: 2,
  tu: 3,
  operator_sekolah: 4,
  guru: 5,
  wali_kelas: 6,
  bk: 7,
  orang_tua: 8,
};

export function getRoleDisplayLabels(roles?: string[] | null) {
  return [...new Set(roles ?? [])]
    .filter(Boolean)
    .sort((a, b) => (rolePriority[a] ?? 100) - (rolePriority[b] ?? 100) || a.localeCompare(b))
    .map((role) => roleDisplayLabels[role] ?? role.split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' '));
}

export function getRoleGreeting(roles?: string[] | null) {
  const labels = getRoleDisplayLabels(roles);
  return labels.length ? ' (' + labels.join(', ') + ')' : '';
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error';
