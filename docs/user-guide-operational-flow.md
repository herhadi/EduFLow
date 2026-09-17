# Panduan Pengguna EduFlow

## Alur Operasional Sekolah Dari Awal

Dokumen ini ditujukan untuk pengguna sekolah, terutama Operator Sekolah, yang akan menyiapkan dan menjalankan EduFlow. Isinya berfokus pada apa yang harus dikerjakan pengguna dan urutan pengerjaannya, bukan konfigurasi teknis aplikasi.

## 1. Siapa Melakukan Apa

| Pengguna | Tanggung jawab utama |
| --- | --- |
| Operator Sekolah | Menyiapkan data sekolah, tahun ajaran, kalender, jadwal, agenda, dan monitoring operasional |
| Guru | Melihat agenda mengajar, melaksanakan KBM, mengisi presensi, perangkat ajar, dan nilai |
| Wali Kelas | Menjalankan tugas sebagai guru dan memantau kelas binaannya, termasuk pengajuan izin/sakit |
| Kepala Sekolah | Memantau KBM, meninjau perangkat ajar, menyetujui nilai, dan membaca laporan |
| Orang Tua/Wali Murid | Melihat presensi dan nilai anak serta mengajukan izin/sakit |
| Root | Menangani akses teknis, kesehatan sistem, backup, recovery, dan dukungan pengguna |

Operator adalah titik awal operasional sekolah. Root hanya perlu memastikan aplikasi dan akun operator sudah tersedia.

## 2. Yang Disiapkan Sebelum Mulai

Operator perlu menyiapkan:

- daftar tahun ajaran dan semester;
- kalender pendidikan atau hari efektif sekolah;
- daftar kelas dan rombel;
- daftar mata pelajaran;
- daftar jam pelajaran;
- data guru dan guru pengganti;
- data siswa;
- data wali murid dan hubungan wali dengan siswa;
- pembagian guru, mata pelajaran, dan kelas;
- rancangan jadwal pelajaran;
- akun pengguna yang akan dipakai oleh guru, kepala sekolah, dan wali murid.

Pastikan data yang digunakan sudah disepakati sekolah. Kesalahan pada kelas, guru, atau jadwal akan memengaruhi agenda, presensi, laporan, dan notifikasi.

## 3. Login Pertama Kali

1. Buka alamat aplikasi EduFlow.
2. Masuk menggunakan username atau email dan password yang diberikan.
3. Jika diminta, segera ganti password awal.
4. Buka **Profil** dan periksa nama, username, email, dan role.
5. Pastikan menu Operator Sekolah tampil, terutama **Master**, **Jadwal**, **Inbox**, dan **Profil**.
6. Jika sekolah menggunakan Telegram, aktifkan Telegram dari menu **Profil**.

Password tidak boleh dibagikan kepada pengguna lain. Setiap orang harus menggunakan akun masing-masing agar aktivitas dan perubahan data dapat ditelusuri.

## 4. Urutan Setup Awal Operator

Kerjakan setup dalam urutan berikut:

```text
Tahun ajaran
  → Semester
  → Kelas dan rombel
  → Jam pelajaran
  → Kalender pendidikan
  → Mata pelajaran
  → Guru dan siswa
  → Akun serta role pengguna
  → Penugasan guru dan wali kelas
  → Jadwal pelajaran
  → Pemeriksaan jadwal
  → Generate agenda
  → Uji operasional
```

Jangan membuat jadwal atau agenda sebelum tahun ajaran, kelas, guru, mata pelajaran, dan jam pelajaran tersedia.

### 4.1 Membuat Tahun Ajaran

1. Buka **Master** → **Akademik**.
2. Buat atau pilih tahun ajaran yang akan digunakan.
3. Gunakan format tahun, misalnya `2026/2027`.
4. Pastikan semester Ganjil dan Genap tersedia.
5. Pastikan tahun ajaran yang benar menjadi tahun aktif.

### 4.2 Menyiapkan Kelas dan Rombel

1. Buka menu data akademik.
2. Tambahkan tingkat kelas, misalnya VII, VIII, atau IX.
3. Tambahkan rombel seperti A, B, C, atau D.
4. Periksa nama kelas agar tidak ada duplikasi.
5. Pastikan setiap siswa nantinya dapat ditempatkan pada satu kelas aktif.

### 4.3 Menyiapkan Jam Pelajaran

1. Buka pengaturan jam pelajaran.
2. Masukkan nomor jam, waktu mulai, dan waktu selesai.
3. Tandai kegiatan tetap seperti upacara, senam, atau istirahat bila diperlukan.
4. Pastikan jam pelajaran sesuai jadwal sekolah.
5. Periksa kembali urutan jam dan jeda.

### 4.4 Mengisi Kalender Pendidikan

1. Buka **Akademik** → **Kalender**.
2. Masukkan hari efektif, libur, kegiatan sekolah, dan hari yang tidak digunakan untuk KBM.
3. Tandai kegiatan yang harus memblokir pembuatan agenda.
4. Simpan dan periksa tanggal yang sudah diisi.

Kalender perlu disiapkan sebelum agenda dibuat. Agenda tidak seharusnya dibuat pada hari libur atau kegiatan yang memblokir KBM.

### 4.5 Mengisi Mata Pelajaran

1. Tambahkan semua mata pelajaran yang digunakan.
2. Gunakan nama dan kode yang konsisten.
3. Periksa apakah mata pelajaran sudah dapat dipilih pada data guru dan jadwal.

### 4.6 Mengisi Guru dan Siswa

Operator dapat mengisi data melalui form atau import data bila tersedia.

Untuk setiap guru, periksa:

- nama;
- NIP atau identitas lain;
- email dan nomor telepon;
- akun login;
- role `guru`;
- mata pelajaran yang diampu;
- tahun ajaran penugasan.

Untuk setiap siswa, periksa:

- nama dan identitas siswa;
- kelas aktif;
- tahun ajaran;
- data wali murid;
- hubungan siswa dengan wali murid.

Satu akun wali murid dapat terhubung dengan lebih dari satu anak. Pastikan hubungan tersebut benar sebelum akun diberikan kepada wali murid.

### 4.7 Membuat Akun dan Menetapkan Role

Buka `/admin/guru` untuk menghubungkan guru dengan akun login dan mengatur penugasan.

Role utama yang perlu disiapkan:

- Kepala Sekolah: `kepala_sekolah`;
- Operator: `operator_sekolah`;
- Guru mapel: `guru`;
- Guru yang juga membina kelas: `guru` dan `wali_kelas`;
- Wali murid: `orang_tua`.

Berikan akun kepada pemiliknya secara pribadi. Minta setiap pengguna login dan mengganti password awal.

### 4.8 Menetapkan Wali Kelas

1. Pilih kelas.
2. Tetapkan guru sebagai wali kelas.
3. Pastikan guru tersebut juga memiliki penugasan sebagai guru.
4. Minta guru login ulang agar perubahan akses terlihat.

Wali kelas tetap menggunakan dashboard guru untuk pekerjaan mengajarnya. Fitur tambahan kelas binaan tersedia melalui menu **Binaan**.

### 4.9 Menyusun Jadwal

1. Buka `/admin/schedules`.
2. Pilih tahun ajaran dan semester.
3. Pilih guru dan mata pelajaran.
4. Pilih tingkat, hari, jam pelajaran, dan rombel.
5. Simpan jadwal.
6. Ulangi sampai semua jadwal selesai.
7. Periksa bentrok guru, kelas, hari, dan jam.

Jadwal adalah pola dasar. Presensi tidak dilakukan terhadap jadwal langsung, melainkan terhadap agenda harian yang dibuat dari jadwal.

### 4.10 Generate Agenda Harian

1. Tetapkan rentang tanggal yang akan dioperasikan.
2. Jalankan pemeriksaan coverage agenda.
3. Generate agenda untuk tanggal yang belum memiliki agenda.
4. Pastikan hari libur dan kegiatan pemblokir dilewati.
5. Periksa jumlah agenda yang berhasil dibuat.
6. Jika ada guru berhalangan, tetapkan guru pengganti pada agenda yang sesuai.

Sebelum sekolah mulai menggunakan presensi, agenda untuk tanggal operasional harus sudah tersedia.

## 5. Uji Coba Sebelum Go-Live

Lakukan uji coba menggunakan akun per role sebelum data sekolah dipakai penuh.

### Uji Operator

- login dan ganti password;
- melihat master data;
- membuat atau memeriksa jadwal;
- generate agenda;
- memeriksa coverage agenda;
- melihat Inbox;
- membuka pengajuan izin/sakit sebagai petugas cadangan.

### Uji Guru

- melihat jadwal pribadi;
- melihat agenda hari ini;
- membuka kelas;
- mengisi status siswa;
- mengisi materi atau catatan KBM;
- mengirim presensi;
- membuat perangkat ajar;
- menyimpan dan mengirim nilai harian.

### Uji Wali Kelas

- melihat kelas binaan;
- melihat siswa kelasnya;
- memeriksa pengajuan izin/sakit;
- menyetujui atau menolak pengajuan sesuai kewenangan.

### Uji Kepala Sekolah

- melihat ringkasan KBM;
- melihat kelas kosong dan guru yang belum submit;
- meninjau perangkat ajar;
- menyetujui atau meminta revisi;
- melihat laporan siswa dan performa guru;
- memeriksa jejak aktivitas.

### Uji Orang Tua

- login ke portal orang tua;
- melihat seluruh anak yang terhubung;
- melihat presensi dan nilai;
- mengajukan izin atau sakit;
- melihat status pengajuan dan notifikasi.

## 6. Operasional Harian

### Sebelum KBM

Operator:

1. Periksa apakah agenda hari ini sudah tersedia.
2. Periksa guru pengganti dan perubahan jadwal.
3. Periksa Inbox untuk masalah operasional.
4. Kirim atau tindak lanjuti informasi penting.

Guru:

1. Buka dashboard **Hari Ini**.
2. Periksa agenda dan jam mengajar.
3. Buka agenda saat KBM dimulai.

### Saat KBM

Guru:

1. Mulai kelas dari agenda yang benar.
2. Isi presensi siswa.
3. Isi materi atau catatan KBM.
4. Isi catatan kendala bila ada.
5. Ambil foto kelas bila diwajibkan sekolah.
6. Submit presensi.

Presensi tidak dapat diselesaikan sebelum checklist wajib dan materi/catatan KBM lengkap.

### Setelah KBM

Operator atau wali kelas:

1. Periksa agenda yang belum submit.
2. Periksa kelas kosong dan kendala KBM.
3. Tindak lanjuti guru yang belum menyelesaikan presensi.
4. Gunakan alur koreksi bila terdapat kesalahan.

Kepala Sekolah:

1. Buka `/principal/dashboard`.
2. Periksa prioritas kelas kosong, belum submit, kendala, dan guru pengganti.
3. Buka detail KBM bila perlu.

## 7. Alur Perangkat Ajar dan Nilai

### Perangkat Ajar

```text
Guru membuat draft
  → Guru submit
  → Kepala Sekolah review
  → Disetujui atau diminta revisi
  → Guru memperbaiki bila diperlukan
  → Guru submit ulang
```

Guru memantau status dari menu perangkat ajar dan Inbox. Kepala Sekolah memberikan catatan yang jelas jika meminta revisi.

### Nilai

```text
Guru membuat komponen penilaian
  → Guru mengisi nilai
  → Guru menyimpan draft
  → Guru submit
  → Kepala Sekolah memeriksa dan approve nilai semester
  → Nilai dikunci
  → Laporan tersedia
```

Nilai yang sudah disetujui dan dikunci tidak dapat diubah melalui proses biasa. Periksa nilai sebelum melakukan submit.

## 8. Alur Izin dan Sakit Siswa

1. Orang tua memilih anak pada `/parent/permits`.
2. Orang tua mengisi tanggal, jenis, dan alasan.
3. Wali kelas memeriksa pengajuan dari `/homeroom/leave-requests`.
4. Operator dapat melakukan review sebagai fallback.
5. Jika disetujui, status presensi siswa menyesuaikan pengajuan.
6. Orang tua melihat status dari menu pengajuan dan Inbox.

## 9. Penanganan Kondisi Umum

### Guru Tidak Bisa Login

Operator memeriksa username atau email, lalu menggunakan fitur reset password jika memiliki kewenangan. Setelah reset, guru login menggunakan password awal dan segera menggantinya.

### Guru Berhalangan Hadir

1. Operator membuka agenda yang terdampak.
2. Operator menetapkan guru pengganti.
3. Guru pengganti membuka agenda tersebut.
4. Guru pengganti mengisi dan submit presensi.

Jadwal dasar tidak perlu diubah hanya karena guru berhalangan pada satu hari.

### Agenda Belum Ada

Operator memeriksa tahun ajaran, jadwal, kalender pendidikan, dan coverage agenda. Setelah penyebab diperbaiki, generate agenda kembali untuk tanggal yang diperlukan.

### Data atau Menu Belum Terlihat

Periksa apakah pengguna sudah login ulang. Perubahan role dan permission baru terbaca setelah sesi diperbarui.

## 10. Checklist Aplikasi Siap Dioperasikan

### Checklist Operator

- [ ] Tahun ajaran aktif sudah benar.
- [ ] Semester tersedia.
- [ ] Kelas dan rombel sudah lengkap.
- [ ] Jam pelajaran sudah benar.
- [ ] Kalender pendidikan sudah diisi.
- [ ] Mata pelajaran sudah lengkap.
- [ ] Guru dan siswa sudah masuk.
- [ ] Akun dan role sudah diberikan.
- [ ] Penugasan guru dan wali kelas sudah benar.
- [ ] Jadwal sudah dibuat dan tidak bentrok.
- [ ] Agenda untuk tanggal operasional sudah digenerate.
- [ ] Guru pengganti sudah disiapkan bila diperlukan.
- [ ] Uji login semua role sudah berhasil.
- [ ] Uji presensi dan laporan sudah berhasil.

### Checklist Pengguna

- [ ] Password awal sudah diganti.
- [ ] Nama dan role sudah benar.
- [ ] Dashboard sesuai role sudah terbuka.
- [ ] Jadwal dan agenda sesuai penugasan.
- [ ] Inbox dapat dibuka.
- [ ] Pengguna memahami kapan harus submit atau approve.

## 11. Operasi Berkala

Setiap hari:

- periksa agenda dan coverage;
- pantau presensi belum submit;
- tindak lanjuti kelas kosong dan kendala;
- periksa pengajuan izin/sakit;
- baca Inbox sesuai role.

Setiap akhir minggu atau periode:

- periksa kelengkapan presensi;
- periksa perangkat ajar yang masih draft atau revisi;
- periksa nilai yang belum submit;
- tinjau laporan operasional;
- pastikan akun pengguna yang tidak aktif ditangani oleh petugas berwenang.

Untuk prosedur deployment, backup, recovery, API, dan troubleshooting teknis, gunakan dokumen teknis terkait di folder `docs/`.
