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
- kelas `VII UAT`,
- 8 siswa `UAT Siswa 01` sampai `UAT Siswa 08`,
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

## Catatan

- Data UAT tidak menghapus data asli.
- Jika angka dashboard KS pernah menunjukkan presensi ada tetapi `Kelas Hari Ini` masih `0`, deploy perubahan terbaru lalu jalankan ulang `npm run prisma:uat --workspace backend` supaya agenda UAT dibuat ulang pada tanggal sekolah yang benar.
- Jika perlu membersihkan data UAT, hapus data dengan prefix `UAT` dari tabel terkait secara hati-hati atau reset database lokal.
- Jalankan `npm run prisma:seed --workspace backend` terlebih dahulu bila role dan permission dasar belum tersedia.
