import { type UserRole } from '../../lib/navigation.config';

export function getMonitoringTitle(role: UserRole) {
  if (role === 'operator_sekolah') {
    return 'Operasional Sekolah Hari Ini';
  }

  if (role === 'kepala_sekolah') {
    return 'Monitoring Sekolah';
  }

  if (role === 'tu') {
    return 'Administrasi Sekolah';
  }

  if (role === 'bk') {
    return 'Monitoring Siswa';
  }

  return 'Monitoring Sistem';
}

export function getMonitoringDescription(role: UserRole) {
  if (role === 'root') {
    return 'Ringkasan teknis dan operasional untuk akses root.';
  }

  return 'Ringkasan kegiatan sekolah disesuaikan dengan tanggung jawab pengguna.';
}
