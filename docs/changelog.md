# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

## 2026-07-15

- Melanjutkan refactor UI global pada alur perangkat ajar: halaman perangkat ajar guru dan review Kepala Sekolah mulai memakai `Button`, `Badge`, `SurfaceCard`, `FormField`, `LoadingState`, dan `EmptyState` agar pola form, status, dan aksi lebih konsisten.
- Melanjutkan migrasi komponen UI global pada nilai harian guru, audit trail, dan sebagian dashboard operasional agar form, search, loading, empty state, status badge, dan tombol aksi memakai pola yang sama.
- Memulai pemecahan `academic-master-management.tsx` dengan mengekstrak konstanta master akademik dan form jam pelajaran ke folder `components/academic-master`, sehingga halaman admin akademik mulai lebih mudah dirawat.
- Memecah panel `Rombongan Belajar` dan `Manajemen Mata Pelajaran` dari `academic-master-management.tsx` ke komponen khusus agar halaman admin akademik tidak lagi menampung seluruh JSX master data dalam satu file.

## 2026-07-14

- Memulai refactor pasca feature-freeze pilot dengan memecah `role-dashboard.tsx`: tipe dashboard dipindah ke `components/dashboards/dashboard-types.ts`, UI shared ke `role-dashboard-shared.tsx`, dashboard Kepala Sekolah ke `principal-dashboard.tsx`, dan dashboard Guru/Wali Kelas ke `teacher-dashboard.tsx`.
- Melanjutkan pemecahan dashboard role dengan memindahkan dashboard Root, Operator, Parent, TU, dan BK ke file `components/dashboards/*`, sehingga `role-dashboard.tsx` tinggal menjadi orkestrator role dan prompt Telegram.
- Memindahkan prompt aktivasi Telegram dan copy fallback monitoring ke komponen/helper terpisah agar `role-dashboard.tsx` hanya menangani routing role, guard dashboard, dan komposisi dashboard aktif.
- Memulai refactor frontend API client dengan memindahkan transport helper (`request`, `upload`, `download`, restore backup, dan session-expired redirect) dari `lib/api.ts` ke `lib/api-client.ts` tanpa mengubah kontrak ekspor `api`.
- Memisahkan seluruh tipe API frontend ke `lib/api-types.ts` dan menjaga `lib/api.ts` tetap me-reexport tipe lama, sehingga import komponen yang sudah ada tidak perlu berubah.
- Memecah endpoint API frontend tahap awal ke modul `api-modules/auth-api.ts`, `notification-api.ts`, `reporting-api.ts`, dan `operations-api.ts`; `lib/api.ts` tetap menggabungkan modul-modul tersebut agar kontrak `api.*` tidak berubah.
- Memecah endpoint akademik frontend lanjutan ke modul `academic-api.ts`, `planning-api.ts`, `grades-api.ts`, dan `schedule-api.ts`; `lib/api.ts` kini berperan sebagai aggregator tipis untuk import/export akademik, report export URL, parent portal, dan izin/sakit.
- Memindahkan endpoint import/export akademik, report export URL, parent portal, dan izin/sakit ke modul `import-export-api.ts` dan `parent-api.ts`, sehingga `lib/api.ts` menjadi aggregator murni tanpa implementasi endpoint langsung.
- Menambahkan fondasi komponen UI global (`button`, `badge`, `card`, `dialog`, `form`, `table`, `search`, `loading`, dan `empty-state`) lalu mulai menerapkannya pada presensi guru dan report siswa Kepala Sekolah agar pola UI lebih konsisten.
- Melanjutkan migrasi UI global pada notification center, pengajuan izin/sakit parent, dan review izin/sakit wali kelas/operator; menambahkan `docs/frontend-ui.md` sebagai panduan pemakaian komponen reusable.

## 2026-07-13

- Menambahkan data dan panduan UAT melalui `npm run prisma:uat --workspace backend` dan `docs/uat.md`, mencakup akun KS, operator, guru, guru pengganti, parent multi-anak, kelas, agenda, presensi, perangkat ajar, nilai harian, serta skenario Telegram.
- Menstabilkan pembacaan tanggal dashboard KS/operasional dan seed UAT agar mengikuti tanggal kalender sekolah (`SCHOOL_TIMEZONE_OFFSET_MINUTES`) sehingga hasil lokal dan Debian konsisten.
- Merapikan dashboard guru dan KS: ringkasan KBM lebih informatif, prioritas kelas dapat dibuka detailnya, laporan siswa memakai filter/pagination, dan shortcut beranda yang duplikatif dengan navbar dikurangi.
- Menyempurnakan perangkat ajar guru: daftar dokumen menjadi fokus utama, lampiran wajib sebelum kirim review, upload/ganti lampiran tersedia pada draft/revisi, serta PDF/DOCX dapat dibuka online bila URL viewer tersedia.
- Memperkuat alur presensi guru: materi/catatan KBM wajib, mode input siswa list/dropdown, pagination global, tombol presensi nonaktif setelah submit, data lama berbasis `submittedAt` terkunci, dan upload foto kelas tidak lagi merusak daftar siswa.
- Mengunci presensi guru pengganti: guru utama tetap melihat agenda sebagai informasi, tetapi backend dan UI hanya mengizinkan guru pengganti membuka/submit presensi ketika agenda dialihkan.
- Menata portal wali murid menjadi dashboard anak, riwayat presensi/nilai, dan pengajuan izin/sakit; parent multi-anak didukung dan query mengikuti tanggal kalender sekolah.
- Mengaktifkan alur izin/sakit wali murid: model `StudentLeaveRequest`, endpoint parent/reviewer, halaman `/parent/permits`, `/homeroom/leave-requests`, `/admin/leave-requests`, inbox reviewer/parent, serta status `SICK`/`EXCUSED` otomatis diterapkan saat presensi dibuka atau disubmit.
- Menjadikan notifikasi inbox lebih konsisten: worker summary presensi mengirim inbox wali murid, dedupe berdasarkan kontak wali, badge unread global, dan event frontend dipusatkan agar semua role memakai perilaku yang sama.
- Memperbaiki endpoint kelas binaan wali kelas agar tanggal hari ini valid dan timezone-aware, sehingga `/academic/me/homeroom` tidak lagi 500 saat dibuka dari navbar Binaan.
- Merapikan `/parent/reports` agar card riwayat presensi dan nilai harian seimbang di desktop serta tidak pecah di mobile.
- Mengubah detail siswa di `/principal/reports` menjadi tombol expand terpisah untuk `Riwayat` dan `Nilai Harian`, sehingga daftar siswa tetap ringkas tetapi tetap jelas bisa diklik.
- Menata navigasi Kepala Sekolah menjadi lebih sederhana dan informatif: Dashboard, KBM, Siswa, Guru, Review, Inbox, dan Profil; menambahkan halaman `/principal/kbm` untuk monitoring KBM harian dan memperjelas `/principal/reports` sebagai report siswa.
- Memisahkan fungsi `/principal/dashboard` dan `/principal/kbm`: Beranda KS kini menjadi meja keputusan berisi maksimal 3 agenda prioritas, kalimat status sekolah hari ini, dan antrian tugas KS; detail agenda, checklist, follow-up, serta guru pengganti berada di halaman Detail KBM Harian.
- Membuat ringkasan angka `/principal/reports` lebih compact agar total, hadir, sakit, izin, alpha, dan risiko tetap terlihat tanpa memakan banyak ruang.
- Memindahkan export laporan KS ke halaman khusus `/principal/exports` agar navbar/menu Siswa tetap fokus pada report siswa dan nilai harian.
- Mengganti route aktif report siswa KS menjadi `/principal/student-reports`; route lama `/principal/reports` tetap diarahkan ke halaman baru agar link lama tidak patah.
- Memisahkan root dari operator sekolah: root memakai namespace `/system/*` untuk support teknis, operator tetap memakai `/admin/*` untuk operasional akademik, dan seed RBAC mencabut permission akademik harian dari role root.
- Mengubah label navbar dashboard guru/wali kelas dan parent menjadi `Beranda` agar konsisten dan tidak bertumpuk di layar kecil.

## 2026-07-10

- Mengaktifkan integrasi Telegram bot: backend menerima webhook `/api/auth/telegram/webhook`, memproses `/start <token>` dari halaman Profil, menyimpan `User.telegramId`, dan worker notifikasi mengirim pesan melalui Telegram Bot API.
- Menambahkan konfigurasi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, dan `TELEGRAM_WEBHOOK_URL` pada environment example, serta memperjelas dokumentasi aktivasi Telegram dan retry notifikasi.
- Menambahkan peringatan aktivasi Telegram pada beranda setiap role; tombolnya langsung membuka bot Telegram dan peringatan hilang otomatis setelah `User.telegramId` tersimpan.
- Menambahkan halaman `/admin/telegram` untuk melihat status konfigurasi bot, memasang webhook dari UI, memantau user yang sudah link Telegram, dan membaca log notifikasi Telegram terbaru.
- Menyesuaikan Docker Compose agar backend membaca secret dari `apps/backend/.env`, tetapi tetap mengunci koneksi container seperti database dan Redis melalui blok `environment`.
- Menambahkan aksi ganti akun Telegram di halaman Profil untuk user yang sudah terhubung.
- Merapikan panel `/admin/telegram` menjadi mode teknis khusus root: tombol Refresh/Set/Hapus webhook, daftar variabel backend, URL webhook final, dan response JSON `getWebhookInfo`.
- Mengubah balasan sukses bot Telegram menjadi sapaan personal sesuai nama akun EduFlow.
- Menambahkan aksi hapus webhook Telegram dari panel root dan menyederhanakan tampilan variabel backend agar mengikuti `TELEGRAM_WEBHOOK_URL`.
- Memperbaiki overflow form create jadwal di mobile dengan grid tingkat/rombel responsif, field `min-width` aman, dan teks slot yang tidak memaksa lebar card.
- Menambahkan command `/help` pada bot Telegram untuk menampilkan panduan aktivasi dan daftar perintah dasar.
- Memperbaiki overflow panel `/admin/telegram` di mobile dan menambahkan guard global agar card/form/panel mobile memakai `min-width` aman saat menampilkan URL, JSON, atau label teknis panjang.
- Menyederhanakan card variabel `/admin/telegram`: `TELEGRAM_WEBHOOK_URL` hanya menampilkan status tersedia, sedangkan URL lengkap ditampilkan di card webhook.
- Menambahkan reminder Telegram guru 5 menit sebelum agenda pertama guru pada hari tersebut, termasuk dedupe agar jadwal berurutan hanya mengirim satu pengingat dan guru pengganti menerima reminder jika agenda digantikan.
- Menambahkan command Telegram on-demand untuk Kepala Sekolah/root/operator: `/kbm` atau `/today` menampilkan ringkasan KBM hari ini dan `/review` menampilkan antrean review, tanpa broadcast otomatis atau penambahan badge Inbox.
- Mempercepat respons webhook Telegram dengan balasan fire-and-forget serta mengembalikan `/start` tanpa token menjadi status personal jika akun Telegram sudah terhubung.
- Menambahkan ringkasan KBM harian awal pada `/principal/dashboard`; alur ini kemudian dipisah agar dashboard menjadi ringkasan cepat dan detail operasional berpindah ke `/principal/kbm`.
- Mengatur prioritas informasi dashboard Kepala Sekolah: kelas kosong, belum submit, kendala KBM, checklist kurang, dan guru pengganti ditampilkan sebelum statistik umum.
- Membuat dashboard Kepala Sekolah lebih compact di mobile dengan urutan KBM di atas, kartu prioritas 2 kolom, strip checklist pendek, dan statistik pendukung tanpa deskripsi panjang.

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
