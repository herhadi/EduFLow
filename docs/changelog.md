# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

## 2026-06-22

- Memperbaiki perintah migration deployment agar Prisma selalu menggunakan schema monorepo `apps/backend/prisma/schema.prisma` dari workdir container `/app`.
- Memindahkan konteks seluruh data akademik dan transaksi keuangan yang ada dari `2026/2027` ke `2025/2026` melalui migrasi data, lalu menyediakan `2026/2027` kosong untuk konfigurasi tahun ajaran baru. Migration hanya melanjutkan bila target `2025/2026` masih kosong.
- Menambahkan export/import PostgreSQL untuk transfer data demo tanpa akun ber-role `root`; akun root target dibuat ulang dari environment Debian setelah import.
- Menetapkan permission `system.recovery.manage` untuk fitur recovery dan operasi backup yang khusus role `root`.
- Menambahkan panel backup pada `/operations` untuk membuat dump PostgreSQL harian dan arsip JSON per tahun ajaran.
- Mengubah backup harian menjadi unduhan langsung ke perangkat admin, tanpa menyimpan dump penuh pada host server.
- Memperjelas panel backup `/operations`, termasuk fallback pilihan tahun ajaran ketika permission recovery baru belum termuat pada sesi browser.
- Menambahkan restore dump PostgreSQL dari perangkat admin pada panel operasi dengan konfirmasi eksplisit.
- Menambahkan migration grant permission `system.recovery.manage` ke role `root` agar deploy normal tidak bergantung pada seed untuk akses recovery.
- Mengubah dropdown tahun ajaran di panel backup agar membaca endpoint akademik langsung dan tidak memicu 403 dari endpoint recovery.
- Memisahkan permission `/operations`: dashboard health memakai `reporting.read`, aksi queue memakai `reporting.manage`, sedangkan backup/restore tetap khusus `system.recovery.manage`.
- Memperbaiki pilihan awal tahun ajaran pada form jadwal, data master, dan perangkat ajar agar memilih tahun berjalan, bukan tahun ajaran masa depan yang masih kosong.
- Memisahkan tampilan jadwal per tahun ajaran secara ketat serta membuat semester `Ganjil` dan `Genap` otomatis pada setiap tahun ajaran baru.
- Memilih semester aktif secara otomatis pada form jadwal; tahun ajaran masa depan selalu dimulai dari pilihan `Ganjil`.
- Menambahkan revisi jadwal efektif per tanggal agar baseline tahunan tidak diduplikasi saat terjadi perubahan Ganjil, Genap, atau tengah semester.

## 2026-06-21

- Menambahkan CI/CD v1 dengan GitHub Actions self-hosted runner.
- Menambahkan `scripts/deploy.sh`, `scripts/healthcheck.sh`, dan helper logging/deploy.
- Menambahkan logging deployment ke `logs/deploy/`.
- Menambahkan Dockerfile frontend dan backend untuk pola Docker/VPS satu stack.
- Mendokumentasikan pola deployment `/api/backend` dan `BACKEND_INTERNAL_API_URL`.
- Memisahkan dokumentasi VPS ke dokumen operasional yang lebih spesifik.
- Memperbarui workflow deploy agar memakai `actions/checkout@v5`, menjalankan deploy via `bash`, dan menampilkan tail log saat gagal tanpa upload artifact.
- Memisahkan port publishing PostgreSQL/Redis ke `docker-compose.local.yml` agar deployment VPS tidak bentrok dengan port host `5432` atau `6379`.
- Memperbaiki smart deploy agar perubahan frontend-only tidak menyalakan ulang backend, PostgreSQL, atau Redis.
- Memperbaiki workflow deploy agar menjalankan script dari direktori production server (`/srv/eduflow/app`) sebelum build image.
- Menegaskan Docker build context production selalu `/srv/eduflow/app` atau `EDUFLOW_DEPLOY_PATH`, bukan checkout sementara GitHub runner.
- Memindahkan default log deployment production dari `/srv/eduflow/app/logs/deploy` ke `/srv/eduflow/logs/deploy`.
- Mengubah validasi production agar deploy gagal jika repository memiliki perubahan lokal, bukan melakukan auto-stash.
- Menambahkan summary deployment dan trap error yang menampilkan command, exit code, dan line number.
- Mengubah Docker cleanup menjadi `docker image prune -af --filter "until=72h"`.
- Menambahkan endpoint frontend `GET /api/health` dan mengubah healthcheck frontend agar tidak memakai halaman `/login`.
- Menambahkan retry HTTP healthcheck agar deploy menunggu frontend/backend siap setelah restart container.
- Memperbaiki retry healthcheck agar error `curl` seperti exit code 56 tidak mematikan script sebelum retry berjalan.
