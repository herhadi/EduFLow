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
| `root` | Akses semua fitur untuk owner/dev/super admin teknis |
| `operator_sekolah` | Operator akademik dan konfigurasi operasional sekolah |
| `guru` | Guru pengajar |
| `wali_kelas` | Guru dengan tanggung jawab kelas |
| `kepala_sekolah` | Monitoring dan laporan sekolah |
| `tu` | Tata usaha |
| `bk` | Bimbingan konseling |
| `orang_tua` | Wali murid |

## Permission Awal

| Permission | Fungsi |
| --- | --- |
| `auth.session.manage` | Mengelola session sendiri |
| `academic.read` | Membaca data akademik |
| `academic.manage` | Mengelola master data akademik |
| `academic-calendar.read` | Membaca kalender pendidikan |
| `academic-calendar.manage` | Mengelola kalender pendidikan |
| `schedule.read` | Membaca jadwal |
| `schedule.manage` | Mengelola jadwal |
| `teaching-plan.read` | Membaca perangkat ajar guru |
| `teaching-plan.manage` | Mengelola Program Tahunan, Program Semester, KKTP, perencanaan pembelajaran, dan buku KBM |
| `teaching-plan.review` | Review, approve, atau minta revisi perangkat ajar |
| `student-grade.read` | Membaca nilai siswa |
| `student-grade.manage` | Mengelola nilai siswa |
| `student-grade.approve` | Approve dan lock nilai semester |
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
| `system.recovery.manage` | Mengelola backup, restore, dan recovery sistem |

## Matrix Role Ke Permission

| Permission | root | operator_sekolah | guru | wali_kelas | kepala_sekolah | tu | bk | orang_tua |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `auth.session.manage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `academic.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `academic.manage` | ✓ | ✓ |  |  |  | ✓ |  |  |
| `academic-calendar.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `academic-calendar.manage` | ✓ | ✓ |  |  |  | ✓ |  |  |
| `schedule.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `schedule.manage` | ✓ | ✓ |  |  |  |  |  |  |
| `teaching-plan.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `teaching-plan.manage` | ✓ |  | ✓ |  |  |  |  |  |
| `teaching-plan.review` | ✓ |  |  |  | ✓ |  |  |  |
| `student-grade.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |
| `student-grade.manage` | ✓ |  | ✓ |  |  |  |  |  |
| `student-grade.approve` | ✓ |  |  |  | ✓ |  |  |  |
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
| `system.recovery.manage` | ✓ |  |  |  |  |  |  |  |

## Scope Data

Permission menentukan capability. Scope data tetap harus dibatasi:

- Guru hanya mengelola agenda yang ditugaskan.
- Guru hanya mengelola perangkat ajar dan nilai untuk kelas/mapel yang diampu.
- Guru mapel belum tentu wali kelas; wali kelas pasti guru mapel dan merupakan penugasan tambahan pada kelas.
- Akun wali kelas tetap memiliki role `guru`, sehingga pekerjaan harian seperti jadwal dan presensi memakai permission guru. Scope wali kelas hanya menambah akses baca kelas binaan.
- Operator sekolah mengelola kalender pendidikan dan jadwal sekolah.
- Root adalah akses teknis semua fitur, bukan role pekerjaan harian sekolah.
- Wali kelas hanya melihat kelas binaannya.
- Orang tua hanya melihat data anaknya.
- Kepala sekolah dapat melihat laporan seluruh sekolah.
- Operator sekolah dapat mengelola data akademik operasional.

Scope ini diterapkan di query service, bukan di nama role.

## Seed Permission

Seeder awal sebaiknya:

1. membuat semua permission,
2. membuat role awal,
3. menghubungkan role dengan permission sesuai matrix,
4. membuat admin awal dari environment variable,
5. tidak menghapus permission lama secara otomatis.
