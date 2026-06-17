# Workflow Administrasi Sekolah

Dokumen ini menjelaskan urutan konfigurasi awal EduFlow setelah root pertama berhasil login.

## Setup Jadwal Banyak Kelas

Slot jam pada form pembuatan jadwal ditampilkan sebagai susunan hari yang dapat diklik, bukan dropdown. Operator dapat memilih beberapa slot sekaligus untuk kelas, guru, dan mata pelajaran yang sama. Seluruh sesi disimpan dalam satu transaksi agar tidak ada jadwal yang tersimpan sebagian ketika ditemukan bentrok.

Operator Sekolah mengelola template jadwal, tetapi tidak melakukan generate agenda manual. Permission `agenda.generate` hanya diberikan kepada root untuk kebutuhan koreksi operasional dan pengujian; alur normal agenda dijalankan otomatis oleh scheduler.

Jeda pertama selalu `Istirahat`. Khusus jeda kedua tersedia pilihan per kelas: `Istirahat` sebagai nilai default atau `Istirahat/Sholat Berjamaah`. Pilihan disimpan sebagai override kelas sehingga kegiatan sholat berjamaah tidak otomatis diterapkan ke seluruh kelas.

Urutan setup jadwal:

1. Pilih tahun ajaran dan semester.
2. Pilih guru pengampu. Nama mata pelajaran melekat pada opsi guru, misalnya `Guru A · PPKn`.
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

Pada `/admin/guru`, operator dapat menambahkan data guru baru langsung dari panel `Pilih Guru`. Setelah dibuat, guru otomatis terpilih untuk dilanjutkan ke pengaturan akun login, role, mata pelajaran, dan wali kelas.

Data guru hasil import dapat dilengkapi dari kartu `Guru Terpilih` pada `/admin/guru`. Operator dapat mengedit nama, NIP, NUPTK, nomor HP, email, Telegram ID, dan URL foto, kemudian menyimpan bersamaan dengan pengaturan akun guru.

Semua daftar dan dropdown kelas wajib memakai helper `sortSchoolClasses` dari `@eduflow/shared`. Urutan standar adalah tingkat VII, VIII, IX, kemudian rombel A, B, C, dan seterusnya. Jangan membuat sorting kelas lokal di masing-masing komponen.

Halaman `/teacher/schedules` membaca `GET /api/academic/me/schedules`, sehingga guru hanya melihat jadwal yang terhubung ke akun guru yang sedang login.

| URL | Fungsi |
| --- | --- |
| `/admin` | Menu utama administrasi |
| `/admin/guru` | Akun, role, mapel ampu, dan wali kelas |
| `/admin/akademik` | Kelas dan mata pelajaran |
| `/admin/akses` | User, role, status akun, dan penghapusan user |
| `/schedules` | Setup jadwal kelas keseluruhan dan generate agenda |
| `/import-data` | Import data guru dan siswa dari Excel |

## Navigasi Role-Based

### Tema Antarmuka

Frontend menggunakan tema biru modern dengan mode terang dan gelap. Pilihan tema disimpan pada browser melalui key `eduflow-theme`, mengikuti preferensi perangkat ketika pengguna belum memilih, dan diterapkan sebelum halaman dirender untuk mencegah kilatan tema. Komponen baru wajib memakai token global pada `apps/frontend/app/globals.css` atau komponen UI bersama agar konsisten dan tetap terbaca pada dark mode.

Hero/card utama halaman memakai lebar penuh container dan token `page-hero` agar kontras pada mode terang maupun gelap. Profil guru dapat menyimpan `Teacher.photoUrl`; foto tersebut tampil pada beranda guru dan halaman profil, dengan fallback inisial jika belum tersedia.

Bottom navigation bukan daftar semua fitur. Bottom navigation adalah menu utama sesuai actor yang sedang login:

- `root`: `Admin`, `Ops`, `Audit`, `Inbox`, `Profil`.
- `operator_sekolah`: `Beranda`, `Data`, `Jadwal`, `Inbox`, `Profil`.
- `kepala_sekolah`: `Beranda`, `Review`, `Performa`, `Inbox`, `Profil`.
- `guru`: `Hari Ini`, `Jadwal`, `Presensi`, `Inbox`, `Profil`.
- `wali_kelas`: `Hari Ini`, `Jadwal`, `Presensi`, `Inbox`, `Profil`.
- `tu`: `Data`, `Import`, `Report`, `Inbox`, `Profil`.
- `bk`: `Home`, `Siswa`, `Laporan`, `Inbox`, `Profil`.
- `orang_tua`: `Anak`, `Inbox`, `Riwayat`, `Info`, `Profil`.

Item paling kanan selalu `Profil` untuk kebutuhan personal seperti ganti password, session management, dan preferensi akun.

Item `Inbox` memakai icon pesan dan memiliki badge/dot jika ada notifikasi `PENDING` atau `FAILED`. Item `Profil` memakai icon orang.

`Ops` hanya muncul untuk `root` karena berisi health check, queue monitoring, failed jobs, dan tindakan teknis operasional sistem.

`Admin` pada bottom navigation berarti pekerjaan `operator_sekolah` sebagai admin operasional akademik, bukan root teknis.

Top submenu berbentuk deretan tombol dihapus karena menduplikasi bottom navigation dan akses cepat pada dashboard. Perpindahan fitur dilakukan melalui bottom navigation sesuai role dan kartu menu pada halaman beranda masing-masing actor.

Konfigurasi navigasi global berada di `apps/frontend/lib/navigation.config.ts`.

Dashboard dipisahkan per role:

- `root`: `/dashboard`.
- `operator_sekolah`: `/dashboard/admin`.
- `kepala_sekolah`: `/dashboard/kepala-sekolah`.
- `guru`: `/dashboard/guru`.
- `wali_kelas`: `/dashboard/wali-kelas`.
- `orang_tua`: `/dashboard/orang-tua`.
- `tu`: `/dashboard/tu`.
- `bk`: `/dashboard/bk`.

Login mengarahkan user langsung ke dashboard sesuai role. Jika user non-root membuka `/dashboard`, frontend mengarahkan ke dashboard role-nya.

Dashboard wajib menampilkan information architecture sesuai actor:

- Operator Sekolah melihat ruang kerja admin seperti kesiapan data akademik, validasi jadwal, kelengkapan guru, kesehatan operasional, dan checklist sebelum KBM. Jangan mengisi dashboard admin dengan daftar akses cepat yang menduplikasi bottom navigation.
- Guru melihat agenda hari ini, jadwal pribadi, presensi, perangkat ajar, penilaian, notifikasi, serta kelas binaan jika menjadi wali kelas.
- Kepala Sekolah melihat pusat review, inbox keputusan, performa guru, laporan sekolah, dan jejak aktivitas supervisi.

Catatan jadwal:

- `/schedules` adalah area admin/operator untuk setup jadwal keseluruhan.
- `/teacher/schedules` adalah area guru untuk melihat jadwal mengajar miliknya sendiri.
- `/teacher/attendance` adalah area guru untuk membuka kelas dan mengisi presensi.
- Role lain dapat memiliki halaman jadwal berbeda sesuai konteks, misalnya monitoring jadwal untuk kepala sekolah atau jadwal anak untuk orang tua.

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

## Manajemen Kelas

Jumlah kelas tidak di-hardcode. Data awal `2026/2027`:

- VII A-H,
- VIII A-G,
- IX A-G.

Admin dapat menambah rombel baru seperti `VII-I` atau menghapus rombel kosong melalui `/admin/akademik`.

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
  -> tentukan password sementara atau kosongkan untuk default
  -> pilih role
  -> pilih satu atau beberapa mapel
  -> pilih kelas binaan jika wali kelas
  -> simpan
```

Aturan:

- guru mapel belum tentu wali kelas,
- wali kelas pasti guru mapel,
- memilih `wali_kelas` otomatis mempertahankan role `guru`,
- satu guru dapat mengampu banyak mata pelajaran,
- password default akun baru memakai `DEFAULT_USER_PASSWORD` di `apps/backend/.env`,
- panjang password minimal 6 dan maksimal 10 karakter,
- satu mata pelajaran dapat diampu banyak guru.
- jika password user masih sama dengan `DEFAULT_USER_PASSWORD`, login wajib menampilkan form ganti password,
- form ganti password meminta password baru dan ulangi password,
- setelah password baru tersimpan, user langsung diarahkan ke dashboard sesuai role.

Contoh konfigurasi:

```text
Guru A
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
- Guru A tetap bisa menjadi wali kelas IX B walaupun jadwal mengajarnya PPKn di VII A-D.
- Untuk mengosongkan wali kelas, klik ulang kelas yang sedang aktif atau tekan `Kosongkan wali kelas`, lalu simpan.
- Untuk mengganti wali kelas, kosongkan pilihan lama atau langsung pilih kelas lain pada guru yang sama, lalu simpan.

## Tabel Jadwal Kelas

Halaman `/schedules` menyediakan tabel jadwal per kelas:

- pilih kelas,
- lihat daftar hari, jam, mapel, dan guru,
- klik `Edit` untuk memperbaiki jadwal,
- wali kelas ditampilkan sebagai konteks kelas, bukan sebagai guru pengajar otomatis.

Catatan UI `/schedules`:

- card form dan card tabel wajib memakai `min-w-0` di dalam grid agar tampilan mobile tidak terpotong,
- tabel jadwal boleh horizontal scroll di dalam card, tetapi card tidak boleh melebar keluar viewport,
- date picker pada `Tanggal agenda` mengikuti pola global `.date-picker-control`.

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
