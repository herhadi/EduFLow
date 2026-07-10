# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

## 2026-07-10

- Mengaktifkan integrasi Telegram bot: backend menerima webhook `/api/auth/telegram/webhook`, memproses `/start <token>` dari halaman Profil, menyimpan `User.telegramId`, dan worker notifikasi mengirim pesan melalui Telegram Bot API.
- Menambahkan konfigurasi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, dan `TELEGRAM_WEBHOOK_URL` pada environment example, serta memperjelas dokumentasi aktivasi Telegram dan retry notifikasi.
- Menambahkan peringatan aktivasi Telegram pada beranda setiap role; tombolnya langsung membuka bot Telegram dan peringatan hilang otomatis setelah `User.telegramId` tersimpan.
- Menambahkan halaman `/admin/telegram` untuk melihat status konfigurasi bot, memasang webhook dari UI, memantau user yang sudah link Telegram, dan membaca log notifikasi Telegram terbaru.
- Menyesuaikan Docker Compose agar backend membaca secret dari `apps/backend/.env`, tetapi tetap mengunci koneksi container seperti database dan Redis melalui blok `environment`.
- Menambahkan aksi ganti akun Telegram di halaman Profil untuk user yang sudah terhubung.

## 2026-07-09

- Mengubah carousel landing page menjadi banner sorotan besar dengan overlay teks, kontrol panah, tab kategori, dan visual yang lebih dekat ke pola hero korporat.
- Menstabilkan carousel landing agar infinite loop tetap mulus dan tidak blank setelah tab/browser dibiarkan lama.
- Menambahkan alur lupa password berbasis request: user mengirim username dari halaman login, request valid masuk ke Inbox root/operator, lalu admin mereset password ke default environment dan memaksa user mengganti password saat login berikutnya.
- Menambahkan penanda revisi perangkat ajar untuk Kepala Sekolah berupa bagian/halaman dan prioritas `Tinggi`, `Sedang`, atau `Rendah`, lalu menampilkannya pada halaman perangkat ajar guru.
- Menambahkan kontrol KBM harian: cek coverage agenda yang belum digenerate, checklist KBM pada submit presensi, dan guru pengganti per agenda harian tanpa mengubah baseline jadwal.
- Menampilkan ringkasan Kendali KBM pada dashboard operasional: checklist, kendala, agenda yang perlu tindak lanjut, dan guru pengganti hari ini.
- Menambahkan Report Siswa pada halaman laporan Kepala Sekolah dengan filter kelas/rentang/status, indikator risiko presensi, detail presensi terbaru, serta slot nilai harian untuk modul penilaian berikutnya.
- Menambahkan modul nilai harian guru: model `Assessment`/`AssessmentScore`, endpoint `/api/student-grades/assessments`, halaman `/teacher/assessments`, draft skor siswa, submit nilai, dan integrasi nilai harian ke detail Report Siswa.
- Merapikan halaman login dengan background tone app yang lebih hidup, dukungan dark mode, header atas yang lebih rapi, serta panel lupa password yang lebih kontras namun tetap ringan.

## 2026-07-03

- Menambahkan namespace route untuk wali kelas, orang tua, TU, dan BK agar navigasi tidak lagi bergantung pada route global seperti `/reports`, `/parent-portal`, `/master-data`, atau `/dashboard/bk`.
- Menambahkan namespace route kepala sekolah untuk performa guru, laporan sekolah, dan audit supervisi: `/principal/teacher-performance`, `/principal/reports`, dan `/principal/audit`.
- Menambahkan guard ringan di shell frontend untuk memberi peringatan akses ditolak dan redirect ketika user membuka namespace role yang tidak sesuai.
- Mengubah prioritas akun `guru + wali_kelas` agar tetap masuk ke dashboard guru, dengan menu tambahan `Binaan` untuk tugas wali kelas.
- Mengaktifkan halaman `/homeroom/students` dengan endpoint `GET /api/academic/me/homeroom` untuk kelas binaan, ringkasan presensi, kontak wali murid, dan daftar siswa perlu perhatian.
- Memperketat endpoint baca data akademik internal dan presensi dengan permission guard eksplisit.
- Merapikan `/principal/teacher-performance` menjadi monitoring compact: default bulan ini, filter cepat, pencarian guru, filter status risiko, detail aktivitas collapse, dan muat bertahap 10 guru.

## 2026-06-30

- Memindahkan foto profil dan Telegram ke level `User` agar semua role dapat mengelola profil dari halaman Profil.
- Menyinkronkan foto guru dan foto profil akun untuk guru yang sudah memiliki user login, termasuk backfill foto/Telegram lama dari `Teacher` ke `User`.
- Melengkapi halaman Profil dengan upload foto lokal, token aktivasi Telegram tanpa input ID manual, ubah password mandiri, daftar sesi, dan aksi keluar dari semua perangkat.
- Menambahkan endpoint `POST /api/auth/change-password`, `GET/PATCH /api/auth/me/profile`, `POST /api/auth/me/profile/photo`, `POST /api/auth/me/telegram/link-token`, dan `POST /api/auth/telegram/link/confirm`.
- Membersihkan notifikasi operasional dari data `IN_APP`, menambahkan tab Inbox untuk root/operator, dan mengubah badge Inbox agar berbasis unread pribadi.
- Menambahkan metadata perangkat pada session aktif, termasuk penanda perangkat saat ini, IP, dan ringkasan browser/perangkat di halaman Profil.
- Merapikan dokumentasi operasional dengan menggabungkan dokumen kecil `operations` dan `workflow` ke `architecture` serta `infrastructure` agar referensi utama lebih mudah dibaca.
- Memperjelas batas implementasi aktivasi Telegram: backend menyediakan token dan endpoint confirm, sementara bot Telegram harus memanggil endpoint confirm dari alur `/start <token>`.

## 2026-06-22

- Memperbaiki perintah migration deployment agar Prisma selalu menggunakan schema monorepo `apps/backend/prisma/schema.prisma` dari workdir container `/app`.
- Membatasi menu dan halaman `/admin/akses` hanya untuk `root`; user non-root mendapat peringatan akses ditolak lalu diarahkan ke dashboard sesuai role.
- Merapikan namespace frontend role-aware: operator masuk ke `/admin/dashboard`, setup jadwal berada di `/admin/schedules`, master data di `/admin/data`, sementara Inbox dan Profil memakai namespace role seperti `/admin/notifications`, `/teacher/profile`, dan `/principal/notifications`.
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
