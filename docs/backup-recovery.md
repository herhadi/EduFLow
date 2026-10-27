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

## Backup dan Penghapusan Cloudflare R2 Berdasarkan Rentang Waktu

Panel pengelolaan tersedia di `/operations` pada bagian **Cloudflare R2 — Backup & Hapus berdasarkan Waktu**. Pengguna harus memiliki permission `system.recovery.manage`; pada konfigurasi seed default, permission ini hanya diberikan kepada role `root`.

### Alur aman

1. Pilih tanggal awal dan akhir. Filter memakai waktu modifikasi objek (`LastModified`) dalam UTC; kedua tanggal inklusif penuh, dari 00:00:00.000 UTC pada tanggal awal sampai 23:59:59.999 UTC pada tanggal akhir.
2. Opsional, masukkan prefix untuk membatasi folder/key, misalnya `uploads/teachers/`.
3. Klik **Preview Objek** untuk melihat daftar key, waktu modifikasi, jumlah objek, dan ukuran total. Preview tidak mengubah storage.
4. **Download Backup ZIP** mengunduh objek yang cocok beserta `manifest.json` ke perangkat admin.
5. Hapus hanya setelah memastikan preview dan backup sesuai. Klik **Hapus Objek Rentang**, kemudian ketik persis `DELETE R2 OBJECTS`.
6. Backend menghitung ulang rentang dan menolak aksi jika jumlah atau ukuran berubah sejak preview. Hasil operasi dicatat dalam audit trail.

### Batas dan konfigurasi

- Maksimal 1.000 objek per preview, backup, atau penghapusan. Jika hasil melebihi batas, gunakan rentang lebih sempit atau prefix.
- Ukuran objek mentah yang dibackup default maksimal 128 MiB agar proses ZIP tidak menggunakan memori berlebihan. Sesuaikan di environment backend dengan `R2_BACKUP_MAX_BYTES=134217728` (nilai dalam byte). Bila dinaikkan, pertimbangkan kapasitas RAM container/backend.
- ZIP disusun dari objek yang dipilih dan berisi `manifest.json`; arsip tidak disimpan ke bucket R2. Simpan hasil download pada lokasi aman/terenkripsi dan verifikasi sebelum penghapusan.
- Penghapusan objek R2 permanen dari perspektif aplikasi dan tidak memiliki tombol undo. Jangan menganggap aksi ini sebagai pengganti lifecycle policy atau versi immutable.
- Backup range ini mem-backup objek terpilih, bukan konfigurasi bucket, lifecycle/CORS policy, atau metadata eksternal yang tidak diekspos oleh S3 API.
- Credential R2 S3 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) harus sudah valid. Credential membutuhkan izin list/read untuk preview dan backup serta write/delete untuk penghapusan.
- Jika preview menunjukkan ukuran 0 byte tetapi objek cocok, tetap cek jumlah dan daftar key; object kosong merupakan objek sah.

### Validasi sebelum menghapus

- Unduh dan buka ZIP terlebih dahulu.
- Cocokkan jumlah objek dan ukuran total pada manifest.
- Pastikan rentang tanggal dan prefix benar.
- Jangan menjalankan hapus saat upload/replace file masih aktif pada prefix yang sama.
- Jalankan preview ulang bila backend menolak karena data berubah.


## Pemantauan Cloudflare R2 Usage

Bagian **Cloudflare R2 Usage** di `/operations` menampilkan nama bucket, jumlah objek, total ukuran, sumber data, dan waktu pemeriksaan. Tombol **Refresh Usage** meminta data terbaru.

Backend menggunakan Cloudflare Analytics bila `CLOUDFLARE_API_TOKEN` tersedia dan query Analytics berhasil. Jika Analytics tidak tersedia, backend menghitung objek melalui S3 listing hingga 10.000 objek. Bila batas tersebut tercapai, `isPartial=true` dan UI menandai hasil sebagai parsial. Untuk bucket besar, gunakan Analytics dan pastikan token Cloudflare mempunyai izin baca analytics yang sesuai.

Angka ukuran adalah pemakaian payload objek, bukan estimasi tagihan. Biaya aktual bergantung pada metrik dan tarif Cloudflare R2, termasuk operasi Class A/Class B dan transfer data yang relevan.
