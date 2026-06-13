# Workflow Administrasi Sekolah

Dokumen ini menjelaskan urutan konfigurasi awal EduFlow setelah root pertama berhasil login.

## Route Admin

| URL | Fungsi |
| --- | --- |
| `/admin` | Menu utama administrasi |
| `/admin/guru` | Akun, role, mapel ampu, dan wali kelas |
| `/admin/akademik` | Kelas dan mata pelajaran |
| `/admin/akses` | User, role, status akun, dan penghapusan user |
| `/schedules` | Setup jadwal kelas keseluruhan dan generate agenda |
| `/import-data` | Import data guru dan siswa dari Excel |

## Navigasi Role-Based

Bottom navigation bukan daftar semua fitur. Bottom navigation adalah menu utama sesuai actor yang sedang login:

- `root`: `Admin`, `Ops`, `Audit`, `Notif`, `Profil`.
- `operator_sekolah`: `Home`, `Admin`, `Setup`, `Notif`, `Profil`.
- `kepala_sekolah`: `Home`, `Guru`, `Report`, `Notif`, `Profil`.
- `guru` dan `wali_kelas`: `Hari Ini`, `Jadwal Saya`, `Presensi`, `Notif`, `Profil`.
- `tu`: `Data`, `Import`, `Report`, `Notif`, `Profil`.
- `bk`: `Home`, `Siswa`, `Laporan`, `Notif`, `Profil`.
- `orang_tua`: `Anak`, `Notif`, `Riwayat`, `Info`, `Profil`.

Item paling kanan selalu `Profil` untuk kebutuhan personal seperti ganti password, session management, dan preferensi akun.

Item `Notif` memiliki badge/dot jika ada notifikasi `PENDING` atau `FAILED`.

`Ops` hanya muncul untuk `root` karena berisi health check, queue monitoring, failed jobs, dan tindakan teknis operasional sistem.

`Admin` pada bottom navigation berarti pekerjaan `operator_sekolah` sebagai admin operasional akademik, bukan root teknis.

Top navigation adalah submenu dari menu utama aktif. Contoh:

- Saat berada di area `Admin`: `Guru`, `Akademik`, `Akses`, `Import`, `Audit`.
- Saat berada di area `Setup Jadwal`: `Setup Jadwal`, `Mapel Guru`, `Kelas & Mapel`.
- Saat berada di area `Ops`: `Health`, `Notifikasi`, `Audit`.
- Saat berada di area `Report`: `Export`, `Performa Guru`, `Parent Portal`.
- Saat berada di area `Profil`: `Profil`, `Notifikasi`.

Konfigurasi navigasi global berada di `apps/frontend/lib/navigation.config.ts`.

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
