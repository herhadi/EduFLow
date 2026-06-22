# Backup & Recovery

Dokumen ini menjelaskan prosedur backup dan restore EduFlow untuk PostgreSQL dan Redis.

Prinsip utama:

- PostgreSQL adalah sumber data permanen utama.
- Redis berisi queue, cache, dan state sementara.
- Backup PostgreSQL wajib diprioritaskan.
- Restore harus selalu diuji secara berkala, bukan hanya dibuat.

## Lokasi Script

```txt
infra/backup/
  backup-postgres.sh
  restore-postgres.sh
  backup-redis.sh
  restore-redis.sh
```

Output backup lokal default:

```txt
backups/
  postgres/
  redis/
```

Folder `backups/` tidak boleh masuk Git.

## Backup PostgreSQL

Jalankan:

```bash
./infra/backup/backup-postgres.sh
```

Default:

- compose file: `docker-compose.yml`
- service: `postgres`
- database: `eduflow`
- user: `eduflow`
- output: `backups/postgres/eduflow-YYYYMMDD-HHMMSS.dump`

Override jika diperlukan:

```bash
POSTGRES_DB=eduflow \
POSTGRES_USER=eduflow \
POSTGRES_SERVICE=postgres \
BACKUP_DIR=/secure/backups/postgres \
./infra/backup/backup-postgres.sh
```

Catatan:

- Format backup menggunakan `pg_dump -F c`.
- File `.sha256` dibuat jika `shasum` atau `sha256sum` tersedia.
- Simpan salinan backup ke storage di luar server sekolah.

## Restore PostgreSQL

Restore bersifat destruktif karena database target akan dibuat ulang.

Jalankan:

```bash
CONFIRM_RESTORE=eduflow \
./infra/backup/restore-postgres.sh backups/postgres/eduflow-YYYYMMDD-HHMMSS.dump
```

Langkah yang dilakukan:

- drop database target jika ada,
- create database target,
- restore dari file `.dump`.

Checklist sebelum restore:

- pastikan file backup benar,
- hentikan backend sementara jika restore dilakukan di production,
- informasikan operator sekolah,
- simpan backup terakhir sebelum restore,
- setelah restore, jalankan health check.

## Transfer Data Demo Tanpa Root

Untuk memindahkan data demo lokal ke Debian tanpa membawa akun pengguna ber-role `root`, gunakan export dan import khusus berikut. Export membuat clone database sementara, menghapus akun root beserta token, audit, dan referensi akunnya dari clone tersebut, lalu menghasilkan dump PostgreSQL. Database lokal asli tidak diubah.

Di komputer sumber, pastikan PostgreSQL Compose sudah berjalan, lalu jalankan dari root repository:

```bash
./infra/backup/export-postgres-without-root.sh
```

Output default berada di `backups/transfer/` bersama checksum `.sha256`. Pindahkan file `.dump` dan checksum-nya ke server Debian melalui kanal yang aman. Jangan commit atau mengunggah dump ke repository.

Di server Debian, jalankan dari `/srv/eduflow/app`:

```bash
CONFIRM_IMPORT=eduflow \
./infra/backup/import-postgres-without-root.sh \
  /path/ke/eduflow-without-root-YYYYMMDD-HHMMSS.dump
```

Import ini bersifat destruktif: database target dibackup ke `backups/pre-import/`, backend dan frontend dihentikan, database ditimpa, lalu Prisma migration dijalankan. Setelah itu Prisma seed membuat kembali akun `root` memakai `ROOT_EMAIL`, `ROOT_USERNAME`, `ROOT_NAME`, dan `ROOT_PASSWORD` milik environment Debian. Akun root dari komputer sumber tidak pernah masuk ke dump transfer.

Setelah import, data akademik lama berada pada `2025/2026`; `2026/2027` tersedia kosong untuk konfigurasi baru.

## Backup Redis

Jalankan:

```bash
./infra/backup/backup-redis.sh
```

Default:

- compose file: `docker-compose.yml`
- service: `redis`
- output: `backups/redis/redis-YYYYMMDD-HHMMSS.rdb`

Catatan:

- Script menjalankan `BGSAVE`.
- File `/data/dump.rdb` disalin dari container Redis.
- Redis bukan source of truth, tetapi backup Redis berguna untuk queue recovery.

## Restore Redis

Restore Redis akan menimpa snapshot Redis saat ini.

Jalankan:

```bash
CONFIRM_RESTORE=eduflow \
./infra/backup/restore-redis.sh backups/redis/redis-YYYYMMDD-HHMMSS.rdb
```

Langkah yang dilakukan:

- stop service Redis,
- copy file `.rdb` ke `/data/dump.rdb`,
- start Redis kembali.

Checklist setelah restore:

- cek `GET /health/redis`,
- cek `GET /health/queue`,
- cek dashboard operasi,
- pastikan failed jobs diretry manual jika perlu.

## Health Check Setelah Restore

Jalankan:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/database
curl http://localhost:3001/health/redis
curl http://localhost:3001/health/queue
```

Ekspektasi:

```json
{
  "status": "Healthy"
}
```

## Jadwal Backup Rekomendasi

Minimal untuk sekolah:

- PostgreSQL harian pada malam hari.
- PostgreSQL tambahan sebelum import data besar.
- Redis harian jika queue penting sedang aktif.
- Retensi harian 7 hari.
- Retensi mingguan 4 minggu.
- Retensi bulanan 6-12 bulan.

Contoh cron harian:

```cron
0 23 * * * cd /path/to/EduFlow && ./infra/backup/backup-postgres.sh
15 23 * * * cd /path/to/EduFlow && ./infra/backup/backup-redis.sh
```

## Recovery Drill

Minimal sebulan sekali:

1. Ambil backup terbaru.
2. Restore ke environment staging/lokal.
3. Jalankan health check.
4. Login sebagai operator.
5. Cek data siswa, jadwal, presensi, notifikasi, dan invoice.
6. Catat durasi restore dan masalah yang muncul.

Target awal:

- PostgreSQL bisa direstore kurang dari 30 menit.
- Health check kembali `Healthy`.
- Data inti sekolah terbaca.

## Catatan Keamanan

- Backup berisi data sensitif siswa dan wali murid.
- Jangan commit file backup.
- Simpan backup di storage terenkripsi.
- Batasi akses backup hanya untuk admin teknis.
- Jangan kirim backup lewat chat publik.
