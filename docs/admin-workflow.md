# Workflow Administrasi Sekolah

Dokumen ini menjelaskan urutan konfigurasi awal EduFlow setelah root pertama berhasil login.

## Route Admin

| URL | Fungsi |
| --- | --- |
| `/admin` | Menu utama administrasi |
| `/admin/guru` | Akun, role, mapel ampu, dan wali kelas |
| `/admin/akademik` | Kelas dan mata pelajaran |
| `/admin/akses` | User, role, status akun, dan penghapusan user |
| `/schedules` | Jadwal pelajaran dan generate agenda |
| `/import-data` | Import data sekolah dari Excel |

## Urutan Konfigurasi Awal

```text
Root login
  -> buat Operator Sekolah
  -> atur tahun ajaran dan semester
  -> atur kelas/rombel
  -> atur mata pelajaran
  -> import atau lengkapi data guru
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

## Manajemen Guru

`Teacher` adalah profil pegawai/guru. `User` adalah akun login.

Flow membuat guru dapat login:

```text
Pilih Teacher
  -> tentukan username/email
  -> tentukan password sementara
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
- satu mata pelajaran dapat diampu banyak guru.

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
