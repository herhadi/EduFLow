# Database

PostgreSQL adalah source of truth EduFlow. Redis bukan database utama.

## Aturan Utama

- Gunakan UUID untuk primary identifier entity utama.
- Gunakan soft delete untuk entity penting.
- Simpan konteks tahun ajaran dan semester pada data akademik.
- Catat perubahan penting ke `AuditLog`.
- Terapkan perubahan schema melalui migration Prisma.

## Relasi Akademik

`Schedule` adalah template tetap. `DailyAgenda` adalah realisasi jadwal pada tanggal tertentu. `StudentAttendance` wajib mengacu pada `DailyAgenda`.

## Autentikasi

Password disimpan sebagai bcrypt hash. Refresh token bersifat opaque dan hanya hash SHA-256-nya yang disimpan di PostgreSQL.

