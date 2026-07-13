# UAT EduFlow

Dokumen ini dipakai untuk uji alur utama sebelum fitur dipakai dengan data sekolah asli.

## Data UAT

Jalankan dari root project:

```bash
npm run prisma:uat --workspace backend
```

Script ini idempotent dan membuat data berprefix `UAT`:

- akun Kepala Sekolah: `uat.ks`,
- akun guru/wali kelas: `uat.guru1`,
- akun guru mapel: `uat.guru2`,
- akun guru pengganti: `uat.guru3`,
- akun wali murid: `uat.parent1`,
- kelas `VII UAT`,
- 8 siswa `UAT Siswa 01` sampai `UAT Siswa 08`,
- `uat.parent1` terhubung ke `UAT Siswa 01` dan `UAT Siswa 02` untuk menguji wali murid dengan lebih dari satu anak,
- jadwal dan agenda hari ini,
- antrean review perangkat ajar,
- nilai harian submitted.

Password mengikuti `DEFAULT_USER_PASSWORD` pada `apps/backend/.env`, default `123456`.
Tanggal agenda UAT mengikuti `SCHOOL_TIMEZONE_OFFSET_MINUTES` agar dashboard membaca hari sekolah yang sama di lokal dan Debian.

## Skenario Uji

### Dashboard Kepala Sekolah

Login sebagai `uat.ks`, buka `/principal/dashboard`, lalu pastikan:

- `Kelas kosong` bernilai `1`,
- `Belum submit` bernilai minimal `2`,
- `Kendala KBM` bernilai `1`,
- `Checklist kurang` bernilai `1`,
- `Guru pengganti` bernilai `1`,
- daftar perhatian menampilkan kelas `VII UAT`.

### Review Kepala Sekolah

Buka `/principal/review`, lalu pastikan:

- ada perangkat ajar `UAT RPP Matematika`,
- KS dapat membuka antrean review,
- KS dapat menyetujui atau meminta revisi dengan catatan.

### Dashboard Guru

Login sebagai `uat.guru1`, buka `/teacher/dashboard` dan `/teacher/attendance`, lalu pastikan:

- dashboard guru menampilkan ringkasan agenda hari ini, jumlah presensi sudah/belum submit, prioritas agenda berikutnya, status perangkat ajar, dan ringkasan nilai,
- guru dapat melihat agenda hari ini,
- presensi memiliki dua mode input siswa: `List` 2 kolom dengan pagination 10 baris dan `Dropdown` siswa/status,
- `Materi/Catatan KBM` wajib diisi sebelum submit karena menjadi dasar checklist materi terisi,
- tombol `Selesaikan Presensi` baru aktif setelah checklist wajib dan materi/catatan KBM lengkap; catatan kendala bersifat opsional,
- agenda yang sudah submitted menampilkan tombol presensi nonaktif agar tidak diinput ulang,
- akun guru/wali kelas tetap masuk dashboard guru,
- kelas binaan tersedia untuk akun yang memiliki role wali kelas.

### Report Siswa

Buka `/principal/reports`, lalu pastikan:

- kelas `VII UAT` tersedia,
- siswa UAT muncul,
- presensi dan nilai harian UAT terbaca pada report siswa.

### Telegram

Jika bot sudah dikonfigurasi:

- aktivasi Telegram pada akun `uat.ks`,
- kirim `/start` dan pastikan balasan personal,
- kirim `/kbm` atau `/today` dan pastikan ringkasan KBM sama dengan dashboard KS,
- kirim `/review` dan pastikan antrean review muncul,
- aktivasi Telegram pada `uat.guru1` lalu pastikan reminder guru tidak dobel untuk jadwal berurutan.

### Portal Orang Tua

Login sebagai `uat.parent1`, buka `/parent/dashboard`, lalu pastikan:

- ringkasan kehadiran anak langsung tampil tanpa input kontak manual,
- data anak `UAT Siswa 01` tampil dengan kelas aktif,
- data anak `UAT Siswa 02` juga tampil pada akun yang sama,
- ringkasan hari ini dan riwayat presensi terbaca setelah presensi UAT disubmit.
- buka `/parent/reports` untuk memastikan riwayat presensi dan nilai harian UAT tampil,
- buka `/parent/permits` untuk memastikan menu pengajuan izin/sakit sudah terpisah dari riwayat dan masih ditandai belum aktif sampai approval dibuat.

## Catatan

- Data UAT tidak menghapus data asli.
- Jika angka dashboard KS pernah menunjukkan presensi ada tetapi `Kelas Hari Ini` masih `0`, deploy perubahan terbaru lalu jalankan ulang `npm run prisma:uat --workspace backend` supaya agenda UAT dibuat ulang pada tanggal sekolah yang benar.
- Jika perlu membersihkan data UAT, hapus data dengan prefix `UAT` dari tabel terkait secara hati-hati atau reset database lokal.
- Jalankan `npm run prisma:seed --workspace backend` terlebih dahulu bila role dan permission dasar belum tersedia.
