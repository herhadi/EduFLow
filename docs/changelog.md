# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

## 2026-07-13

- Menambahkan script data UAT `npm run prisma:uat --workspace backend` untuk membuat akun KS, guru, guru pengganti, kelas, siswa, jadwal, agenda, presensi, perangkat ajar, dan nilai harian berprefix `UAT`.
- Menambahkan dokumen `docs/uat.md` berisi akun test dan skenario UAT dashboard KS, review, dashboard guru, report siswa, serta Telegram.
- Memperbaiki pembacaan tanggal dashboard operasional/Kepala Sekolah agar `DailyAgenda.date` mengikuti tanggal kalender sekolah, dan angka guru/siswa dihitung dari agenda pada tanggal tersebut supaya tidak tercampur dengan presensi agenda lain yang disubmit hari ini.
- Menyesuaikan seed UAT agar tanggal agenda mengikuti `SCHOOL_TIMEZONE_OFFSET_MINUTES`, sehingga hasil dashboard KS konsisten di lokal maupun Debian.
- Merapikan dashboard guru menjadi lebih informatif: ringkasan agenda hari ini, status submit presensi, prioritas agenda berikutnya, perangkat ajar revisi/disetujui, dan draft nilai tampil sebelum kartu menu.
- Mengubah halaman perangkat ajar guru agar daftar dokumen menjadi fokus utama, sementara form `Buat Draft` hanya tampil saat guru menekan tombol.
- Menampilkan lampiran perangkat ajar langsung pada list guru, termasuk nama file, ukuran, dan tombol buka dokumen/foto.
- Menambahkan aksi upload/ganti lampiran langsung pada item perangkat ajar berstatus Draft atau Perlu Revisi, sehingga guru dapat melengkapi dokumen setelah draft dibuat.
- Mewajibkan lampiran sebelum perangkat ajar dikirim ke Kepala Sekolah, memperjelas pesan upload gagal, dan menonjolkan lampiran pada antrean review KS.
- Menambahkan dukungan lampiran PDF untuk perangkat ajar; PDF dibuka inline melalui signed URL R2, sedangkan DOCX diarahkan ke Microsoft Office Online Viewer agar bisa dibaca online bila viewer dapat mengakses URL sementara.
- Merapikan input presensi guru: materi/catatan KBM wajib diisi, list siswa memiliki mode 2 kolom dengan pagination 10 baris, tersedia mode dropdown siswa/status, dan komponen pagination global siap dipakai modul lain.
- Menyempurnakan UAT dashboard KS dan presensi guru: tombol presensi agenda yang sudah submitted menjadi nonaktif, submit presensi terkunci sampai checklist wajib dan materi terisi, kartu prioritas KS dapat diklik untuk melihat detail, serta card Guru/Siswa diberi konteks jumlah.
- Menghapus kartu/tombol shortcut beranda yang menduplikasi menu navbar dan mempertahankan akses pendukung yang tidak ada di navbar utama, seperti laporan/audit KS, perangkat ajar guru, serta halaman pendukung operator.
- Mengoptimalkan `/principal/reports` untuk jumlah siswa besar dengan filter risiko, ringkasan hasil filter, pagination global 10 siswa per halaman, dan detail siswa tetap expand/collapse.
- Menyiapkan UAT parent: seed membuat akun `uat.parent1`, dashboard parent otomatis membuka ringkasan berdasarkan email wali murid, dan query parent memakai tanggal kalender sekolah.
- Memperbaiki tombol presensi guru agar agenda `COMPLETED` ikut dianggap sudah submitted sehingga tombol `Buka Presensi` otomatis nonaktif setelah presensi selesai.
- Mengunci ulang alur presensi guru berdasarkan `submittedAt` selain state, sehingga data lama yang terlanjur `DRAFT` tetapi sudah pernah submit tidak bisa dibuka/submit ulang dan dashboard KS tetap menghitungnya sebagai submitted.
- Merapikan navigasi wali murid dengan menghapus menu `Info` yang masih menduplikasi `Riwayat`, sehingga navbar parent hanya menampilkan halaman yang punya fungsi jelas.
- Memisahkan portal wali murid menjadi dashboard `Anak`, halaman `Riwayat` untuk presensi dan nilai harian yang sudah disubmit guru, serta halaman `Izin` sebagai alur persiapan pengajuan izin/sakit sebelum model approval diaktifkan.
- Membedakan tampilan `/parent/dashboard` dan `/parent/reports`: dashboard parent kini hanya menonjolkan status anak hari ini, sedangkan report fokus pada riwayat presensi dan nilai.
- Menyesuaikan seed UAT parent agar akun `uat.parent1` memiliki dua anak (`UAT Siswa 01` dan `UAT Siswa 02`) untuk menguji tampilan multi-anak.
- Mengunci presensi agenda dengan guru pengganti: guru utama tetap melihat agenda sebagai informasi, tetapi tombol presensi nonaktif dan backend hanya mengizinkan guru pengganti membuka/submit presensi.
- Memperbaiki submit presensi setelah upload foto kelas agar response upload tetap membawa daftar siswa, sehingga UI tidak kadang gagal dengan error `Cannot read properties of undefined (reading 'map')`.
- Mengaktifkan worker summary presensi untuk membuat inbox wali murid setelah guru submit presensi, termasuk dedupe berdasarkan kontak wali agar parent dengan data guardian duplikat tidak menerima notifikasi ganda.
- Memperjelas badge unread navbar menjadi angka dan menyegarkan hitungan saat route berubah/tab kembali aktif, sehingga inbox parent yang punya unread langsung terlihat di navigasi.
- Menjadikan perilaku inbox global di frontend: event perubahan notifikasi, hitung unread, dan badge angka dipusatkan agar parent/guru/KS/operator memakai pola yang sama.
- Mengaktifkan alur pengajuan izin/sakit wali murid: model `StudentLeaveRequest`, endpoint parent dan review, halaman `/parent/permits`, halaman review `/homeroom/leave-requests` dan `/admin/leave-requests`, update presensi saat approved, serta inbox untuk reviewer dan parent.
- Membuat izin/sakit approved otomatis terbawa saat guru membuka presensi; status `SICK`/`EXCUSED` juga tetap dipertahankan saat submit agar tidak tertimpa pilihan manual.

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
- Menambahkan ringkasan KBM harian langsung pada `/principal/dashboard` agar Kepala Sekolah melihat kelas berjalan, presensi, checklist KBM, guru pengganti, dan agenda perlu perhatian tanpa membuka laporan terpisah.
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
