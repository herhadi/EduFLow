# Permission Matrix: Role Dan Capability

EduFlow memakai permission-based RBAC. Role hanya kumpulan permission, bukan logika yang di-hardcode.

## Prinsip

- Jangan memakai `if role === "admin"` dalam business logic.
- Endpoint memakai `@RequirePermissions(...)`.
- Role dapat berubah sesuai kebutuhan sekolah.
- Permission harus merepresentasikan capability, bukan jabatan.

## Role Awal

| Role | Deskripsi |
| --- | --- |
| `admin` | Pengelola sistem penuh |
| `operator` | Operator akademik harian |
| `guru` | Guru pengajar |
| `wali-kelas` | Guru dengan tanggung jawab kelas |
| `kepala-sekolah` | Monitoring dan laporan sekolah |
| `tu` | Tata usaha |
| `bk` | Bimbingan konseling |
| `orang-tua` | Wali murid |

## Permission Awal

| Permission | Fungsi |
| --- | --- |
| `auth.session.manage` | Mengelola session sendiri |
| `academic.read` | Membaca data akademik |
| `academic.manage` | Mengelola master data akademik |
| `schedule.read` | Membaca jadwal |
| `schedule.manage` | Mengelola jadwal |
| `agenda.read` | Membaca agenda harian |
| `agenda.generate` | Generate agenda harian |
| `attendance.read` | Membaca presensi |
| `attendance.manage` | Mengisi atau mengoreksi presensi |
| `class-status.read` | Membaca status kelas |
| `class-status.manage` | Mengubah status kelas |
| `notification.read` | Membaca riwayat notifikasi |
| `notification.manage` | Mengelola template dan pengiriman notifikasi |
| `reporting.read` | Membaca laporan |
| `reporting.manage` | Mengelola job atau konfigurasi laporan |
| `audit.read` | Membaca audit trail |
| `user.manage` | Mengelola user, role, dan permission |

## Matrix Role Ke Permission

| Permission | admin | operator | guru | wali-kelas | kepala-sekolah | tu | bk | orang-tua |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `auth.session.manage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `academic.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `academic.manage` | ✓ | ✓ |  |  |  | ✓ |  |  |
| `schedule.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `schedule.manage` | ✓ | ✓ |  |  |  |  |  |  |
| `agenda.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `agenda.generate` | ✓ | ✓ |  |  |  |  |  |  |
| `attendance.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |
| `attendance.manage` | ✓ | ✓ | ✓ |  |  |  |  |  |
| `class-status.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |
| `class-status.manage` | ✓ | ✓ | ✓ |  |  |  |  |  |
| `notification.read` | ✓ | ✓ |  | ✓ | ✓ | ✓ |  |  |
| `notification.manage` | ✓ | ✓ |  |  |  |  |  |  |
| `reporting.read` | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ |  |
| `reporting.manage` | ✓ | ✓ |  |  |  |  |  |  |
| `audit.read` | ✓ | ✓ |  |  | ✓ |  |  |  |
| `user.manage` | ✓ |  |  |  |  |  |  |  |

## Scope Data

Permission menentukan capability. Scope data tetap harus dibatasi:

- Guru hanya mengelola agenda yang ditugaskan.
- Wali kelas hanya melihat kelas binaannya.
- Orang tua hanya melihat data anaknya.
- Kepala sekolah dapat melihat laporan seluruh sekolah.
- Operator dapat mengelola data akademik operasional.

Scope ini diterapkan di query service, bukan di nama role.

## Seed Permission

Seeder awal sebaiknya:

1. membuat semua permission,
2. membuat role awal,
3. menghubungkan role dengan permission sesuai matrix,
4. membuat admin awal dari environment variable,
5. tidak menghapus permission lama secara otomatis.

