export const roleCards = [
  {
    role: 'root',
    label: 'Root',
    description: 'Akses teknis semua fitur untuk owner/dev/super admin. Tidak dipakai operasional harian.',
    permissions: ['Semua permission', 'Recovery sistem', 'Kelola user dan role'],
  },
  {
    role: 'operator_sekolah',
    label: 'Operator Sekolah',
    description: 'Actor utama untuk kalender pendidikan, jadwal, master akademik, import, dan generate agenda.',
    permissions: ['academic.manage', 'academic-calendar.manage', 'schedule.manage', 'agenda.generate'],
  },
  {
    role: 'kepala_sekolah',
    label: 'Kepala Sekolah',
    description: 'Monitoring sekolah, review perangkat ajar, approval nilai semester, dan audit terbatas.',
    permissions: ['teaching-plan.review', 'student-grade.approve', 'reporting.read', 'audit.read'],
  },
  {
    role: 'guru',
    label: 'Guru',
    description: 'Mengajar, submit presensi, upload perangkat ajar, dan input nilai siswa sesuai mapel/kelas.',
    permissions: ['attendance.manage', 'teaching-plan.manage', 'student-grade.manage'],
  },
  {
    role: 'wali_kelas',
    label: 'Wali Kelas',
    description: 'Memantau kelas binaan, presensi, ringkasan siswa, dan laporan kelas.',
    permissions: ['attendance.read', 'student-grade.read', 'reporting.read'],
  },
  {
    role: 'tu',
    label: 'TU',
    description: 'Administrasi sekolah dan bantuan data operasional tanpa menjadi admin teknis.',
    permissions: ['academic.manage', 'academic-calendar.manage', 'reporting.read'],
  },
  {
    role: 'bk',
    label: 'Guru BK',
    description: 'Monitoring kehadiran, kedisiplinan, dan tindak lanjut siswa.',
    permissions: ['attendance.read', 'student-grade.read', 'class-status.read'],
  },
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    description: 'Akses portal wali murid untuk melihat presensi dan ringkasan anak sendiri.',
    permissions: ['attendance.read', 'student-grade.read'],
  },
];

export const explanationCards = [
  {
    title: 'Nonaktif',
    description:
      'Data disembunyikan dari operasional baru, tetapi histori jadwal, agenda, presensi, audit, dan laporan lama tetap aman.',
    tone: 'bg-blue-50 text-brand-700 border-blue-100',
  },
  {
    title: 'Hapus permanen',
    description:
      'Data benar-benar dihapus dari database. Ini rawan merusak relasi dan histori, jadi tidak dipakai untuk entity penting.',
    tone: 'bg-rose-50 text-rose-700 border-rose-100',
  },
];

export type NewUserForm = {
  email: string;
  username: string;
  name: string;
  role: string;
};
