# Workflow Administrasi Sekolah

Dokumen ini menjelaskan urutan konfigurasi awal EduFlow setelah root pertama berhasil login.

## Setup Jadwal Banyak Kelas

Slot jam pada form pembuatan jadwal ditampilkan sebagai susunan hari yang dapat diklik, bukan dropdown. Operator dapat memilih beberapa slot sekaligus untuk kelas, guru, dan mata pelajaran yang sama. Seluruh sesi disimpan dalam satu transaksi agar tidak ada jadwal yang tersimpan sebagian ketika ditemukan bentrok.

Operator Sekolah mengelola template jadwal dan dapat melakukan generate agenda manual bila diperlukan untuk operasional harian. Permission `agenda.generate` diberikan kepada `root` dan `operator_sekolah`; alur normal agenda tetap dapat dijalankan otomatis oleh scheduler.

Jeda pertama selalu `Istirahat`. Khusus jeda kedua tersedia pilihan per kelas: `Istirahat` sebagai nilai default atau `Istirahat/Sholat Berjamaah`. Pilihan disimpan sebagai override kelas sehingga kegiatan sholat berjamaah tidak otomatis diterapkan ke seluruh kelas.

Urutan setup jadwal:

1. Pilih tahun ajaran dan semester.
2. Pilih guru pengampu. Nama mata pelajaran melekat pada opsi guru, misalnya `Guru PPKn · PPKn`.
3. Pilih tingkat kelas (`VII`, `VIII`, atau `IX`).
4. Pilih hari.
5. Klik jam pelajaran yang digunakan agar pilihan rombel terbuka, lalu pilih kelas seperti `A`, `B`, `C`, atau `D`. Jam yang tidak digunakan tetap tertutup dan tidak disimpan.
6. Simpan jadwal.

Jika seorang guru mengampu IPA tingkat VII, operator dapat menetapkan jam ke-2 untuk VII-A, jam ke-3 untuk VII-B, dan jam ke-4 untuk VII-C serta VII-D dalam satu penyimpanan. Setiap slot membawa daftar rombelnya sendiri sehingga tidak terjadi kombinasi silang. Jika seorang guru mengampu dua mata pelajaran, guru tersebut tampil sebagai dua opsi berbeda. Backend tetap menolak bentrok kelas maupun bentrok jam mengajar guru.

Setelah jadwal disimpan, form mempertahankan tahun ajaran, semester, guru/mapel, tingkat, dan hari yang sedang dikerjakan. Sistem hanya mengosongkan pilihan jam dan rombel agar operator dapat melanjutkan penyusunan jadwal guru tersebut tanpa memilih ulang konteks awal.

Jadwal pelajaran memakai `AcademicTimeSlot` sebagai template jam sekolah. Operator memilih hari dan jam pelajaran yang sudah disiapkan, bukan mengetik waktu bebas. Setelah itu operator memilih guru, mapel, tingkat, dan rombel.

Kegiatan tetap seperti Upacara, Senam Bersama, istirahat, dan sholat berjamaah disimpan sebagai slot non-assignable. Kegiatan tersebut muncul pada susunan hari tetapi tidak diperlakukan sebagai mata pelajaran. Preset awal menetapkan Senin jam pertama sebagai Upacara dan Selasa jam pertama sebagai Senam Bersama.

Slot terikat pada tahun ajaran sehingga sekolah dapat mengubah susunan jam untuk tahun ajaran berikutnya tanpa merusak histori jadwal lama.

## Route Admin

Pada `/admin/guru`, operator dapat menambahkan data guru baru langsung dari panel `Pilih Guru`. Setelah dibuat, guru otomatis terpilih untuk dilanjutkan ke pengaturan akun login, role, penugasan tahun ajaran, dan wali kelas.

Data guru hasil import dapat dilengkapi dari kartu `Guru Terpilih` pada `/admin/guru`. Operator dapat mengedit nama, NIP, NUPTK, nomor HP, email, dan foto dari file lokal, kemudian menyimpan bersamaan dengan pengaturan akun guru. Telegram tidak diisi dari admin atau import; semua user mengaktifkannya sendiri dari halaman Profil setelah login.

Semua daftar dan dropdown kelas wajib memakai helper `sortSchoolClasses` dari `@eduflow/shared`. Urutan standar adalah tingkat VII, VIII, IX, kemudian rombel A, B, C, dan seterusnya. Jangan membuat sorting kelas lokal di masing-masing komponen.

Halaman `/teacher/schedules` membaca `GET /api/academic/me/schedules`, sehingga guru hanya melihat jadwal yang terhubung ke akun guru yang sedang login.

| URL | Fungsi |
| --- | --- |
| `/admin/data` | Menu utama master administrasi |
| `/admin/guru` | Akun, role, mapel ampu, dan wali kelas |
| `/admin/akademik` | Kelas dan mata pelajaran |
| `/admin/akses` | User, role, status akun, dan penghapusan user |
| `/admin/schedules` | Setup jadwal kelas keseluruhan dan generate agenda |
| `/admin/import-data` | Import data guru dan siswa dari Excel |

## Navigasi Role-Based

### Tema Antarmuka

Frontend menggunakan tema biru modern dengan mode terang dan gelap. Pilihan tema disimpan pada browser melalui key `eduflow-theme`, mengikuti preferensi perangkat ketika pengguna belum memilih, dan diterapkan sebelum halaman dirender untuk mencegah kilatan tema. Komponen baru wajib memakai token global pada `apps/frontend/app/globals.css` atau komponen UI bersama agar konsisten dan tetap terbaca pada dark mode.

Hero/card utama halaman memakai lebar penuh container dan token `page-hero` agar kontras pada mode terang maupun gelap. Profil user menyimpan foto akun; untuk guru yang sudah terhubung akun login, foto yang diunggah admin dari `/admin/guru` dan foto yang diganti user dari halaman Profil disinkronkan ke file profil yang sama.

Bottom navigation bukan daftar semua fitur. Bottom navigation adalah menu utama sesuai actor yang sedang login:

- `root`: `Admin`, `Ops`, `Audit`, `Inbox`, `Profil`.
- `operator_sekolah`: `Beranda`, `Master`, `Jadwal`, `Inbox`, `Profil`.
- `kepala_sekolah`: `Beranda`, `Review`, `Performa`, `Inbox`, `Profil`.
- `guru`: `Hari Ini`, `Jadwal`, `Presensi`, `Inbox`, `Profil`.
- `wali_kelas`: `Hari Ini`, `Jadwal`, `Presensi`, `Binaan`, `Inbox`, `Profil`.
- `tu`: `Data`, `Import`, `Report`, `Inbox`, `Profil`.
- `bk`: `Home`, `Siswa`, `Laporan`, `Inbox`, `Profil`.
- `orang_tua`: `Anak`, `Inbox`, `Riwayat`, `Info`, `Profil`.

Item paling kanan selalu `Profil` untuk kebutuhan personal seperti ganti password, session management, dan preferensi akun.

Item `Inbox` memakai icon pesan dan memiliki badge/dot jika ada notifikasi pribadi yang belum dibaca. Status operasional seperti `PENDING` atau `FAILED` tetap ditampilkan di tab notifikasi operasional, tetapi tidak mengunci badge unread. Item `Profil` memakai icon orang.

Halaman Profil dipakai oleh semua role untuk melihat identitas login, mengunggah foto dari file lokal perangkat, melihat status Telegram, mengganti akun Telegram, mengubah password, melihat sesi aktif, dan keluar dari semua perangkat. Telegram tidak diketik manual; UI meminta token aktivasi ke backend lalu membuka bot Telegram. Setelah user membuka bot dengan `/start <token>`, webhook Telegram EduFlow mengonfirmasi token dan menyimpan `User.telegramId` otomatis. Jika user belum mengaktifkan Telegram, dashboard role menampilkan peringatan dengan tombol aktivasi langsung ke bot sampai `User.telegramId` tersimpan.

Catatan integrasi Telegram: root mengelola webhook dari `/admin/telegram`. Environment wajib untuk webhook adalah `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_WEBHOOK_URL`; opsional `TELEGRAM_WEBHOOK_SECRET` dan `TELEGRAM_BOT_USERNAME`. Halaman `/admin/telegram` dipakai untuk melihat status konfigurasi, memasang/menghapus webhook, dan membaca response `getWebhookInfo` tanpa menampilkan token bot ke browser.

Command Telegram untuk monitoring sekolah dibuat on-demand agar tidak spam. Kepala Sekolah, root, dan operator sekolah yang sudah mengaktifkan Telegram dapat memakai `/kbm` atau `/today` untuk ringkasan KBM hari ini, serta `/review` untuk antrean perangkat ajar dan nilai yang menunggu review. Command ini tidak membuat `NotificationLog` baru dan tidak menambah badge Inbox.

`Ops` hanya muncul untuk `root` karena berisi health check, queue monitoring, failed jobs, dan tindakan teknis operasional sistem.

`Master` pada bottom navigation operator berarti pusat data administrasi akademik di namespace `/admin/data`, bukan root teknis.

Top submenu berbentuk deretan tombol dihapus karena menduplikasi bottom navigation dan akses cepat pada dashboard. Perpindahan fitur dilakukan melalui bottom navigation sesuai role dan kartu menu pada halaman beranda masing-masing actor.

Konfigurasi navigasi global berada di `apps/frontend/lib/navigation.config.ts`.

Dashboard dipisahkan per role:

- `root`: `/dashboard`.
- `operator_sekolah`: `/admin/dashboard`.
- `kepala_sekolah`: `/principal/dashboard`.
- `guru`: `/teacher/dashboard`.
- `wali_kelas`: `/teacher/dashboard`, karena keseharian tetap sebagai guru. Menu tambahan `Binaan` mengarah ke `/homeroom/students`.
- `orang_tua`: `/parent/dashboard`.
- `tu`: `/tu/dashboard`.
- `bk`: `/bk/dashboard`.

Login mengarahkan user langsung ke dashboard sesuai role. Jika user non-root membuka `/dashboard`, frontend mengarahkan ke dashboard role-nya. Inbox dan Profil juga mengikuti namespace role, misalnya `/admin/notifications`, `/admin/profile`, `/teacher/notifications`, dan `/teacher/profile`. Halaman `/admin/akses` hanya untuk `root`; user non-root yang membuka URL tersebut akan melihat peringatan akses ditolak sebelum diarahkan kembali ke menu sesuai role.

Shell aplikasi juga melakukan guard ringan untuk namespace role. Jika user membuka namespace yang tidak sesuai, misalnya guru membuka `/principal/...` atau orang tua membuka `/tu/...`, browser menampilkan peringatan akses ditolak lalu mengarahkan user ke dashboard role-nya. Validasi final tetap wajib berada di backend permission.

Dashboard wajib menampilkan information architecture sesuai actor:

- Operator Sekolah melihat ruang kerja admin seperti kesiapan data akademik, validasi jadwal, kelengkapan guru, kesehatan operasional, dan checklist sebelum KBM. Jangan mengisi dashboard admin dengan daftar akses cepat yang menduplikasi bottom navigation.
- Guru melihat agenda hari ini, jadwal pribadi, presensi, perangkat ajar, penilaian, notifikasi, serta kelas binaan jika menjadi wali kelas.
- Kepala Sekolah melihat pusat review, inbox keputusan, performa guru, laporan sekolah, jejak aktivitas supervisi, serta ringkasan KBM hari ini langsung di `/principal/dashboard`. Urutan dashboard KS wajib memprioritaskan informasi yang perlu keputusan cepat: kelas kosong, presensi belum submit, kendala KBM, checklist kurang, dan guru pengganti sebelum statistik umum. Tampilan mobile dashboard KS harus compact: prioritas ringkas di atas, checklist KBM dalam strip pendek, lalu statistik pendukung tanpa deskripsi panjang.

Catatan jadwal:

- `/admin/schedules` adalah area admin/operator untuk setup jadwal keseluruhan.
- `/teacher/schedules` adalah area guru untuk melihat jadwal mengajar miliknya sendiri.
- `/teacher/attendance` adalah area guru untuk membuka kelas dan mengisi presensi.
- Role lain dapat memiliki halaman jadwal berbeda sesuai konteks, misalnya monitoring jadwal untuk kepala sekolah atau jadwal anak untuk orang tua.

Catatan namespace kepala sekolah:

- `/principal/dashboard` untuk beranda kepala sekolah.
- `/principal/review` untuk approval perangkat ajar dan nilai.
- `/principal/teacher-performance` untuk monitoring performa guru.
- `/principal/reports` untuk laporan sekolah.
- `/principal/audit` untuk jejak aktivitas supervisi.

Catatan namespace role lain:

- `/homeroom/students` untuk tugas tambahan wali kelas. Jadwal, presensi, inbox, dan profil tetap memakai namespace guru karena wali kelas juga guru.
- Halaman `/homeroom/students` membaca `GET /api/academic/me/homeroom`, sehingga wali kelas hanya melihat kelas yang `homeroomTeacherId`-nya terhubung ke akun guru tersebut pada tahun ajaran aktif.
- `/parent/dashboard`, `/parent/reports`, dan `/parent/info` untuk wali murid.
- `/tu/dashboard`, `/tu/data`, `/tu/import-data`, dan `/tu/reports` untuk tata usaha.
- `/bk/dashboard`, `/bk/students`, dan `/bk/reports` untuk bimbingan konseling.

## Urutan Konfigurasi Awal

```text
Root login
  -> buat Operator Sekolah
  -> atur tahun ajaran dan semester
  -> atur kelas/rombel
  -> atur mata pelajaran
  -> import atau lengkapi data guru dan siswa
  -> hubungkan guru ke akun login
  -> atur role guru
  -> atur mapel ampu guru
  -> atur wali kelas
  -> susun jadwal
  -> generate agenda harian
```

Root awal dibuat oleh Prisma seed dari environment:

- `ROOT_EMAIL`
- `ROOT_USERNAME`
- `ROOT_NAME`
- `ROOT_PASSWORD`

Jika tidak diisi, seed memakai nilai generik non-personal seperti `root@eduflow.local` dan `root`. Jangan menyimpan akun personal atau data contoh di seed. Jika `ROOT_PASSWORD` sama dengan `DEFAULT_USER_PASSWORD`, user root akan diminta mengganti password saat login.

Script seed membaca `apps/backend/.env` saat dijalankan melalui `npm run prisma:seed --workspace backend`, sehingga perubahan `ROOT_*` lokal akan mereset akun root sesuai konfigurasi tersebut.

Form login frontend membaca nilai langsung dari form submit, bukan hanya dari state React, agar password manager atau browser autofill tetap mengirim request login.

## Manajemen Kelas

Jumlah kelas tidak di-hardcode. Data akademik yang sudah ada berada pada tahun ajaran `2025/2026`:

- VII A-H,
- VIII A-G,
- IX A-G.

Admin dapat menambah rombel baru seperti `VII-I` atau menghapus rombel kosong melalui `/admin/akademik`.

Tahun ajaran `2026/2027` disediakan kosong untuk konfigurasi baru. Semester, kelas, siswa terdaftar, jadwal, agenda, slot waktu, dan perangkat ajar tidak disalin otomatis dari tahun sebelumnya.

Form akademik memilih tahun ajaran yang sedang berjalan secara otomatis. Jika belum ada tahun yang aktif pada tanggal perangkat, sistem memakai tahun ajaran terakhir yang sudah dimulai, sehingga tahun ajaran masa depan yang masih kosong tidak menjadi pilihan awal.

Saat pemindahan data awal dilakukan, seluruh transaksi yang sudah telanjur terkait `2026/2027` dipindahkan ke `2025/2026`, termasuk tagihan dan jenis biaya per tahun ajaran. Presensi tetap konsisten karena terhubung ke agenda dan enrollment yang ikut berpindah.

Setiap tahun ajaran selalu memiliki semester `Ganjil` dan `Genap`. Pilihan semester pada form jadwal dibaca dari tabel `Semester`, bukan ditentukan oleh frontend. Memilih tahun ajaran baru hanya menampilkan konfigurasi tahun tersebut; jadwal lama tidak ditampilkan atau dimuat ke konteks tahun ajaran baru.

Kelas, jam pelajaran, dan aktivitas slot terikat pada tahun ajaran. Saat menyiapkan tahun ajaran baru, operator dapat memakai aksi `Salin Master Tahun Ajaran` di `/admin/akademik` untuk menyalin kelas, susunan jam pelajaran, dan aktivitas slot dari tahun sebelumnya ke tahun target. Aksi ini tidak menyalin jadwal mengajar, agenda, presensi, atau penugasan guru sehingga jadwal tahun baru tetap disusun sesuai kebutuhan tahun tersebut.

Pada form jadwal, operator memilih tingkat terlebih dahulu, lalu rombel A, B, C, dan seterusnya tampil otomatis pada setiap slot jam yang bisa dijadwalkan. Jika rombel belum muncul, berarti tahun ajaran tersebut belum memiliki data kelas pada tingkat yang dipilih.

Pengaturan jam pelajaran berada di `/admin/akademik`, bukan di halaman jadwal. Operator dapat menambah, mengubah, atau menghapus slot waktu per tahun ajaran, termasuk nomor jam, jam mulai, jam selesai, jenis slot, dan apakah slot tersebut boleh dipakai untuk jadwal pelajaran. Slot yang sudah dipakai jadwal, revisi jadwal, atau aktivitas kelas tidak dapat dihapus agar histori tetap aman.
Area jam pelajaran menampilkan filter tahun ajaran terlebih dahulu. Form tambah hanya muncul setelah operator menekan `Tambah Jam Pelajaran`, sedangkan form edit muncul langsung pada kartu jam yang dipilih agar operator tidak perlu mencari form di bagian atas halaman.
Untuk slot kegiatan tetap, `Upacara` dikunci pada hari Senin, sedangkan `Senam` dapat dipindahkan ke hari lain sesuai kebutuhan sekolah.

Pemilihan semester awal mengikuti tanggal saat form dibuka. Untuk tahun ajaran yang sedang berlangsung, semester aktif dipilih; untuk tahun ajaran masa depan, sistem memilih semester `Ganjil` sebagai periode pertama.

Saat mengubah jadwal, operator dapat mengisi tanggal mulai berlaku untuk revisi tengah semester. Jika dikosongkan, revisi berlaku sejak awal semester yang dipilih.

Kelas tidak dapat dihapus jika sudah memiliki:

- siswa aktif atau histori enrollment,
- jadwal,
- agenda harian.

## Manajemen Mata Pelajaran

Admin dapat menambah mapel nasional maupun muatan lokal. Satu guru dapat mengampu lebih dari satu mapel melalui relasi `TeacherSubject`.

Mapel tidak dapat dihapus jika sudah digunakan pada jadwal atau agenda. Tujuannya agar histori akademik tetap valid.

## Import Data

Import Excel hanya disediakan untuk:

- `Guru.xlsx`
- `Siswa.xlsx`

Kelas, mata pelajaran, jadwal, role guru, mapel ampu, dan wali kelas sengaja tidak diimpor massal agar konfigurasi akademik tetap mudah diaudit dan dikoreksi melalui halaman admin.

## Manajemen Guru

`Teacher` adalah profil pegawai/guru. `User` adalah akun login.

Flow membuat guru dapat login:

```text
Pilih Teacher
  -> tentukan username/email
  -> pilih role
  -> pilih penugasan tahun ajaran, status, dan mapel ampu
  -> pilih kelas binaan jika wali kelas
  -> simpan
```

Aturan:

- guru mapel belum tentu wali kelas,
- wali kelas pasti guru mapel,
- memilih `wali_kelas` otomatis mempertahankan role `guru`,
- satu guru dapat mengampu banyak mata pelajaran melalui penugasan tahun ajaran,
- password default akun baru memakai `DEFAULT_USER_PASSWORD` di `apps/backend/.env`,
- panjang password minimal 6 dan maksimal 10 karakter,
- satu mata pelajaran dapat diampu banyak guru,
- jika password user masih sama dengan `DEFAULT_USER_PASSWORD`, login wajib menampilkan form ganti password,
- form ganti password meminta password baru dan ulangi password,
- setelah password baru tersimpan, user langsung diarahkan ke dashboard sesuai role.
- tidak ada pendaftaran akun publik dari halaman login; user dibuat dari data resmi sekolah oleh root/operator yang berwenang,
- bila user lupa password, user mengisi username atau email di halaman login lalu mengirim request reset. Jika data valid, request masuk ke Inbox root/operator. Root/operator memakai tombol reset password pada manajemen user atau manajemen guru. Password kembali ke default environment, sesi aktif dicabut, dan user wajib mengganti password setelah login.

Contoh konfigurasi:

```text
Guru PPKn
  Role:
    - guru
    - wali_kelas
  Mapel ampu:
    - PPKn
  Wali kelas:
    - IX B
  Jadwal mengajar:
    - PPKn VII A
    - PPKn VII B
    - PPKn VII C
    - PPKn VII D
```

Catatan penting:

- Mapel ampu menjawab pertanyaan "guru ini boleh mengajar mapel apa?"
- Jadwal menjawab pertanyaan "guru ini mengajar mapel itu di kelas mana dan jam berapa?"
- Wali kelas adalah tugas binaan kelas, bukan pembatas jadwal mengajar.
- Guru PPKn tetap bisa menjadi wali kelas IX B walaupun jadwal mengajarnya PPKn di VII A-D.
- Untuk mengosongkan wali kelas, klik ulang kelas yang sedang aktif atau tekan `Kosongkan wali kelas`, lalu simpan.
- Untuk mengganti wali kelas, kosongkan pilihan lama atau langsung pilih kelas lain pada guru yang sama, lalu simpan.

## Kaldik

Kaldik adalah master kalender pendidikan per tahun ajaran pada halaman `/admin/akademik/kalender`. Operator sekolah mengisinya mengikuti kalender pendidikan pemerintah dan keputusan sekolah sebelum generate agenda dilakukan. Bila sudah tersedia, Kaldik otomatis memilih tahun ajaran berikutnya agar persiapan dapat dilakukan lebih awal.

1. Pilih tahun ajaran.
2. Tambahkan event untuk libur, ujian atau asesmen, kegiatan sekolah, hari non-KBM, atau kebutuhan lain.
3. Isi judul dan rentang tanggal event.
4. Aktifkan `Blokir pembuatan agenda` untuk tanggal yang tidak boleh memiliki agenda pembelajaran reguler.

Aturan:

- Event Kaldik terikat pada satu tahun ajaran dan tidak boleh melampaui periode tahun ajaran tersebut.
- Generate agenda satu kelas maupun semua kelas VII-IX melewati tanggal yang diblokir Kaldik.
- Event tanpa blokir tetap menjadi catatan operasional sekolah dan tidak menghentikan generate agenda.
- Kaldik tidak menghapus agenda yang sudah terlanjur dibuat; operator perlu meninjau agenda tersebut bila kalender diubah setelah generate.

## Riwayat Penugasan Guru

Pada halaman manajemen guru, operator memilih tahun ajaran lalu menyimpan status penugasan dan mapel ampu guru. Tahun ajaran berikutnya dipilih sebagai default bila tersedia. Penugasan berlaku sejak tahun ajaran yang dipilih dan diteruskan ke tahun berikutnya sampai operator menyimpan perubahan baru.

- Gunakan status `Aktif mengajar` untuk guru yang dapat dipilih pada jadwal tahun tersebut.
- Gunakan `Pensiun`, `Pindah sekolah`, `Cuti`, atau `Tidak ditugaskan` sekali pada tahun ajaran saat perubahan mulai berlaku; status tersebut otomatis terbawa ke tahun berikutnya tanpa entri berulang.
- `Tidak ditugaskan` berarti guru masih tercatat sebagai pegawai tetapi tidak memiliki penugasan mengajar pada tahun ajaran tersebut; gunakan `Pensiun`, `Pindah sekolah`, atau `Cuti` bila salah satu kondisi itu lebih tepat.
- Mapel ampu hanya diatur pada penugasan tahun ajaran dan menjadi acuan jadwal baru. Data mapel global lama dari import sebelumnya dipakai sebagai fallback tampilan dan pilihan awal bagi guru yang belum pernah disimpan penugasannya.
- Penetapan wali kelas divalidasi dari penugasan efektif pada tahun ajaran kelas tersebut. Guru harus berstatus `Aktif mengajar` dan memiliki minimal satu mapel ampu; untuk data lama yang belum memiliki penugasan, sistem memakai mapel global hasil import sebagai fallback.
- Admin dapat memilih foto guru dari file lokal pada form guru. Jika guru sudah memiliki akun login, upload admin ikut memperbarui foto profil `User`; jika user mengganti foto sendiri dari Profil, foto `Teacher` juga ikut diperbarui. File foto disimpan di Cloudflare R2, sedangkan database hanya menyimpan key dan metadata foto. Telegram tidak diatur oleh admin; setiap user mengaktifkannya sendiri dari halaman Profil setelah login.
- Akun guru baru selalu dibuat dengan `DEFAULT_USER_PASSWORD` dari environment. Pada login pertama sistem mewajibkan guru mengganti password tersebut; admin tidak dapat mengatur password dari form guru.
- Bila guru lupa password, admin memakai tombol `Reset Password ke Default`. Sistem mencabut sesi aktif guru dan pada login berikutnya mewajibkan perubahan password.

## Tabel Jadwal Kelas

Halaman `/admin/schedules` menyediakan tabel jadwal per kelas:

- pilih kelas,
- pilih `Lihat kondisi jadwal` untuk melihat baseline atau revisi yang sudah berlaku pada tanggal tersebut,
- gunakan `Filter hari` bila hanya ingin melihat jadwal pada hari tertentu,
- lihat daftar hari, jam, mapel, dan guru,
- gunakan `Generate mulai` dan `Generate sampai`, lalu klik `Generate Agenda Kelas` untuk kelas yang sedang dilihat atau `Generate Semua Kelas VII-IX` untuk seluruh kelas VII, VIII, dan IX dalam rentang tanggal tersebut,
- klik `Edit` untuk memperbaiki jadwal,
- isi `Berlaku mulai` ketika perubahan hanya berlaku sejak tanggal tertentu,
- isi alasan revisi agar histori perubahan mudah diaudit,
- lihat histori revisi dari form edit dan gunakan `Batalkan` untuk menghapus revisi yang salah,
- wali kelas ditampilkan sebagai konteks kelas, bukan sebagai guru pengajar otomatis.

Aturan revisi jadwal:

- `Schedule` adalah baseline template jadwal untuk satu tahun ajaran, bukan jadwal yang hanya berlaku di satu semester.
- `ScheduleRevision` menyimpan perubahan efektif per tanggal, termasuk kelas, mapel, guru, hari, jam, ruang, semester, dan alasan.
- Jika `Berlaku mulai` kosong, revisi berlaku sejak awal semester yang dipilih.
- Tabel jadwal kelas memakai tanggal `Lihat kondisi jadwal`, sedangkan generate agenda memakai rentang `Generate mulai` sampai `Generate sampai`. Generate manual dapat dilakukan untuk satu kelas yang sedang dilihat atau sekaligus semua kelas VII-IX, bukan per jam pelajaran.
- Memilih semester hanya membantu menentukan konteks tanggal awal semester; baseline jadwal tahun ajaran tetap terlihat di Ganjil maupun Genap selama belum ada revisi yang mengubahnya.
- Revisi yang memindahkan jadwal ke kelas lain harus tampil pada kelas tujuan setelah tanggal efektifnya.
- Backend wajib menolak jadwal atau revisi yang menyebabkan bentrok kelas atau bentrok guru dalam tahun ajaran tersebut pada tanggal efektif.
- Jadwal guru pribadi membaca baseline dan revisi, sehingga guru baru hasil revisi dapat melihat jadwalnya.

Catatan UI `/admin/schedules`:

- card form dan card tabel wajib memakai `min-w-0` di dalam grid agar tampilan mobile tidak terpotong,
- tabel jadwal boleh horizontal scroll di dalam card, tetapi card tidak boleh melebar keluar viewport,
- date picker pada `Lihat kondisi jadwal`, `Berlaku mulai`, `Generate mulai`, dan `Generate sampai` mengikuti pola global `.date-picker-control`.

Catatan UI mobile admin:

- setiap card, panel, form, dan grid di mobile wajib aman terhadap teks panjang dengan `min-w-0`, `max-w-full`, dan wrapping/scroll internal,
- URL, JSON, token label, NIP, atau kode teknis panjang tidak boleh membuat frame utama melebar keluar viewport.

## Manajemen User

Gunakan `/admin/akses` untuk:

- membuat user non-guru,
- melihat role user,
- menonaktifkan user,
- menghapus permanen user salah input/test.

Gunakan **Nonaktif** untuk user real yang pernah beraktivitas. Hard delete hanya untuk akun yang belum menjadi bagian histori operasional.

## Toast Global

Semua aksi admin menggunakan toast global berbasis Tailwind CSS untuk feedback sukses, gagal, peringatan, dan informasi.

Implementasi:

- provider: `apps/frontend/components/ui/toast.tsx`,
- registrasi global: `apps/frontend/app/layout.tsx`,
- penggunaan: hook `useToast()`.
