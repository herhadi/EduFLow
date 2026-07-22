export type NotificationTab = 'inbox' | 'sent' | 'failed';
export type PersonalInboxRole = 'teacher' | 'principal' | 'parent';

export const notificationTabs: Array<{ id: NotificationTab; label: string; description: string }> = [
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Notifikasi pribadi untuk akun yang sedang login.',
  },
  {
    id: 'sent',
    label: 'Terkirim',
    description: 'Riwayat notifikasi yang berhasil dikirim.',
  },
  {
    id: 'failed',
    label: 'Gagal',
    description: 'Notifikasi gagal yang perlu dicek operator.',
  },
];

export function getInboxTone(templateKey?: string | null) {
  if (templateKey === 'teaching-plan.revision-requested') return 'border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-400/20 dark:bg-amber-500/15';
  if (templateKey === 'teaching-plan.approved') return 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-500/15';
  return 'border-blue-100 bg-white hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10';
}

export function getInboxLabelTone(templateKey?: string | null) {
  if (templateKey === 'teaching-plan.revision-requested') return 'text-amber-700 dark:text-amber-300';
  if (templateKey === 'teaching-plan.approved') return 'text-emerald-700 dark:text-emerald-300';
  return 'text-brand-700 dark:text-blue-100';
}

export function getPersonalNotificationLabel(
  templateKey: string | null | undefined,
  role: PersonalInboxRole,
) {
  if (role === 'principal') {
    if (templateKey?.startsWith('teaching-plan.')) return 'Review Perangkat Ajar';
    if (templateKey?.startsWith('student-grade.')) return 'Approval Nilai';
    if (templateKey?.startsWith('attendance.class.empty')) return 'Kelas Kosong';
    if (templateKey?.startsWith('attendance.teacher.not-submitted')) return 'Belum Submit';
    if (templateKey?.startsWith('attendance.correction.')) return 'Koreksi Penting';
    if (templateKey?.startsWith('teacher.substitute.')) return 'Guru Pengganti';
    if (templateKey?.startsWith('school.summary.')) return 'Ringkasan Sekolah';
    if (templateKey?.startsWith('academic.announcement.')) return 'Pengumuman Akademik';
    return 'Informasi Kepala Sekolah';
  }

  if (role === 'parent') {
    if (templateKey?.startsWith('attendance.summary.')) return 'Ringkasan Presensi';
    if (templateKey?.startsWith('student-leave.')) return 'Izin/Sakit';
    if (templateKey?.startsWith('academic.announcement.')) return 'Pengumuman Sekolah';
    return 'Informasi Anak';
  }

  if (templateKey?.startsWith('teacher.reminder.')) {
    return 'Reminder Kelas';
  }

  if (templateKey?.startsWith('attendance.correction.')) {
    return 'Koreksi Presensi';
  }

  if (templateKey?.startsWith('student-leave.')) {
    return 'Izin/Sakit Siswa';
  }

  if (templateKey?.startsWith('teaching-plan.')) {
    return 'Perangkat Ajar';
  }

  if (templateKey?.startsWith('student-grade.')) {
    return 'Penilaian';
  }

  return 'Informasi Guru';
}

export function formatNotificationDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
