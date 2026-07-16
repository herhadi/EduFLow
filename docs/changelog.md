# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

Changelog diringkas per tanggal agar mudah dibaca saat pilot. Detail teknis granular tetap dilacak melalui riwayat Git dan dokumen domain terkait.

## 2026-07-16

- Menstandarkan kontrak response backend bertahap melalui `docs/api-contract.md`, helper `ok()`, dan error response global berisi `statusCode`, `message`, `error`, `correlationId`, `path`, `method`, serta `timestamp`.
- Membersihkan pemisahan role operasional: root difokuskan untuk support teknis, sedangkan operator sekolah dan wali kelas tetap menangani izin/sakit, inbox operasional, dan tindak lanjut akademik.
- Memperkaya dashboard operasional root dengan metrik teknis seperti latency database/Redis, queue aktif/failed, pending notification, ukuran file, dan status Cloudflare R2.
- Menambahkan fallback dan status warning untuk Cloudflare R2: upload/preview bisa tetap aktif walaupun detail usage Cloudflare Analytics atau list bucket belum tersedia.
- Menambahkan tone status global pada `components/ui/card` untuk success, danger, warning, dan default, lalu menerapkannya pada health card operasional.
- Memecah `academic.service.ts` menjadi facade tipis dan mengekstrak logika domain ke service kecil: master akademik, kalender akademik, jadwal, generate agenda, manajemen agenda, guru akademik, portal guru, dan siswa akademik.
- Mendokumentasikan struktur baru Academic Module di `docs/architecture.md`, `docs/academic-planning.md`, dan `docs/infrastructure.md`.
- Merapikan dokumentasi dengan menggabungkan `attendance-state.md` ke `attendance-workflow.md`, `testing.md` ke `operational-scenarios.md`, serta `security.md` dan `operations.md` ke `infrastructure.md` agar referensi inti tidak terlalu tersebar.
- Rename dokumen ambigu: `admin-workflow.md` menjadi `operator-workflow.md`, `api-mvp.md` menjadi `api-endpoints.md`, dan `scenarios.md` menjadi `operational-scenarios.md`.

## 2026-07-15

- Melakukan refactor frontend bertahap agar halaman besar lebih mudah dirawat: master akademik, jadwal, guru, dashboard operasional, notification center, akses admin, report siswa, presensi guru, nilai harian, parent portal, performa guru, dan shell mobile.
- Menambahkan dan mulai memakai komponen UI global: `Button`, `Badge`, `Card`, `Dialog`, `FormField`, `Table`, `Search`, `Pagination`, `LoadingState`, dan `EmptyState`.
- Memecah frontend API client menjadi transport, tipe API, dan modul endpoint domain seperti auth, notification, reporting, operations, academic, planning, grades, schedule, import/export, dan parent.
- Merapikan helper akademik backend untuk jadwal, revisi efektif, assignment efektif, generate agenda, coverage agenda, reminder guru, dan payload `DailyAgenda`.
- Menambahkan fondasi monitoring root ops untuk CPU/RAM, uptime backend, request/error rate, latency, notification queue, attendance queue, dan dokumentasi operasi.
- Menetapkan kontrak response JSON backend melalui `docs/api-contract.md` dan mulai menyeragamkan response action auth ke `{ data, message }`.
- Menyederhanakan deploy production agar self-hosted runner tidak tertahan terlalu lama, tetap mendukung build paksa, migration/seed manual, cleanup Docker build cache, dan smart deploy.

## 2026-07-14

- Memecah dashboard role menjadi modul khusus untuk Root, Operator, Kepala Sekolah, Guru/Wali Kelas, Parent, TU, dan BK.
- Memindahkan prompt aktivasi Telegram, copy fallback monitoring, dan komponen dashboard bersama agar `role-dashboard.tsx` menjadi orkestrator role.
- Memecah frontend API client dari `lib/api.ts` menjadi `api-client`, `api-types`, dan modul endpoint domain tanpa mengubah kontrak import lama.
- Menambahkan namespace route dan komponen UI global awal untuk presensi guru, report siswa KS, notification center, pengajuan izin/sakit, dan review wali kelas/operator.
- Menambahkan `docs/frontend-ui.md` sebagai panduan pemakaian komponen reusable.

## 2026-07-13

- Menambahkan data, akun, dan skenario UAT melalui `npm run prisma:uat --workspace backend` serta dokumentasi `docs/uat.md`.
- Menstabilkan tanggal UAT dan dashboard agar mengikuti kalender sekolah melalui `SCHOOL_TIMEZONE_OFFSET_MINUTES`.
- Merapikan dashboard guru, dashboard KS, KBM harian, report siswa, perangkat ajar, presensi guru, guru pengganti, dan portal wali murid berdasarkan hasil UAT.
- Mengaktifkan alur izin/sakit wali murid lengkap: pengajuan parent, review wali kelas/operator, inbox, status presensi otomatis, dan notifikasi.
- Menjadikan badge inbox dan notifikasi summary presensi lebih konsisten untuk semua role.
- Memperbaiki endpoint kelas binaan wali kelas dan tampilan report parent/principal agar aman di desktop maupun mobile.
- Memisahkan navigasi dan namespace root/operator: root memakai `/system/*`, operator memakai `/admin/*`, sedangkan route KS siswa dipindahkan ke `/principal/student-reports`.
- Menyusun dashboard KS sebagai meja keputusan cepat, sementara detail operasional KBM berada di `/principal/kbm` dan export laporan di `/principal/exports`.

## 2026-07-10

- Mengaktifkan integrasi Telegram bot: webhook backend, aktivasi `/start <token>`, penyimpanan `User.telegramId`, worker Telegram, dan balasan personal.
- Menambahkan konfigurasi environment Telegram, dokumentasi aktivasi, retry notifikasi, command `/help`, `/kbm`, `/today`, dan `/review`.
- Menambahkan halaman `/admin/telegram` untuk root: cek konfigurasi, set/hapus webhook, lihat URL webhook final, response `getWebhookInfo`, user terhubung, dan log notifikasi Telegram.
- Menampilkan prompt aktivasi Telegram pada beranda role, dengan tombol langsung menuju bot dan opsi ganti akun Telegram dari Profil.
- Menambahkan reminder Telegram guru 5 menit sebelum agenda pertama guru hari itu, termasuk dedupe jadwal berurutan dan dukungan guru pengganti.
- Memperbaiki overflow mobile pada form create jadwal dan panel teknis Telegram.
- Membuat dashboard KS lebih compact dan memprioritaskan kelas kosong, belum submit, kendala KBM, checklist kurang, serta guru pengganti.

## 2026-07-09

- Merapikan landing page dan login: carousel hero lebih stabil, infinite loop halus, background login lebih hidup, dark mode, dan panel lupa password yang lebih jelas.
- Menambahkan alur lupa password berbasis request username valid yang masuk ke inbox root/operator untuk reset password.
- Menambahkan penanda revisi perangkat ajar KS dengan prioritas tinggi/sedang/rendah dan tampilan revisi pada guru.
- Menambahkan kontrol KBM harian: coverage agenda, checklist submit presensi, kendala KBM, dan guru pengganti per agenda.
- Menambahkan report siswa KS, modul nilai harian guru, dan integrasi nilai harian ke detail report siswa.

## 2026-07-03

- Menambahkan namespace route untuk wali kelas, orang tua, TU, BK, dan Kepala Sekolah agar route global tidak bercampur antar role.
- Menambahkan guard frontend ringan untuk peringatan akses ditolak dan redirect sesuai role.
- Menetapkan akun `guru + wali_kelas` tetap masuk ke dashboard guru dengan menu tambahan `Binaan`.
- Mengaktifkan `/homeroom/students` dan endpoint kelas binaan untuk ringkasan presensi, kontak wali murid, serta siswa perlu perhatian.
- Memperketat permission endpoint akademik internal/presensi dan merapikan monitoring performa guru KS.

## 2026-06-30

- Memindahkan foto profil dan Telegram ke level `User` agar semua role dapat mengelola profil sendiri.
- Menyinkronkan foto guru dengan foto profil akun guru, termasuk backfill data lama dari `Teacher` ke `User`.
- Melengkapi halaman Profil dengan upload foto lokal, token aktivasi Telegram, ubah password, daftar sesi, metadata perangkat, dan aksi keluar dari semua perangkat.
- Menambahkan endpoint profil, foto, ubah password, token Telegram, dan confirm link Telegram.
- Membersihkan notifikasi operasional lama, menambahkan tab Inbox root/operator, dan memperjelas batas implementasi aktivasi Telegram di dokumentasi.

## 2026-06-22

- Memperbaiki migration deployment agar Prisma selalu memakai schema monorepo `apps/backend/prisma/schema.prisma`.
- Memisahkan akses root dan operator: `/admin/akses` khusus root, operator memakai `/admin/dashboard`, `/admin/schedules`, dan `/admin/data`.
- Menata namespace role-aware untuk Inbox, Profil, master data, jadwal, dan halaman operasional.
- Memindahkan data akademik/keuangan dari `2026/2027` ke `2025/2026` dan menyediakan `2026/2027` kosong untuk setup tahun ajaran baru.
- Menambahkan export/import PostgreSQL tanpa akun root, backup/restore root, permission `system.recovery.manage`, dan panel backup operasi.
- Memperbaiki pilihan tahun ajaran aktif pada form jadwal, data master, perangkat ajar, semester otomatis, dan revisi jadwal efektif per tanggal.
- Memisahkan permission `/operations`: health memakai `reporting.read`, queue memakai `reporting.manage`, backup/restore memakai `system.recovery.manage`.

## 2026-06-21

- Menambahkan CI/CD v1 dengan GitHub Actions self-hosted runner, Dockerfile frontend/backend, `scripts/deploy.sh`, `scripts/healthcheck.sh`, dan helper deploy.
- Mendokumentasikan pola deployment `/api/backend`, `BACKEND_INTERNAL_API_URL`, VPS, log deploy, dan summary deployment.
- Memperbaiki workflow deploy agar menggunakan source production server, Docker build context benar, dan gagal bila repo production memiliki perubahan lokal.
- Memisahkan port PostgreSQL/Redis lokal ke `docker-compose.local.yml` agar production tidak bentrok dengan port host.
- Menambahkan smart deploy, cleanup Docker image lama, endpoint frontend `GET /api/health`, dan retry healthcheck frontend/backend.
