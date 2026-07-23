# Manual Guide Pengguna EduFlow Berdasarkan Role

Dokumen ini merupakan panduan penggunaan EduFlow untuk role:

- Root
- Operator Sekolah
- Guru
- Wali Kelas
- Kepala Sekolah
- Orang Tua/Wali Murid

Panduan untuk Tata Usaha (`tu`) dan Bimbingan Konseling (`bk`) tidak dibahas dalam dokumen ini.

> Catatan: menu yang tampil mengikuti role dan permission akun. Seorang pengguna hanya dapat melihat data sesuai kewenangan dan cakupan penugasannya.

---

## 1. Panduan Umum Semua Pengguna

### 1.1 Login

1. Buka alamat EduFlow sekolah.
2. Masukkan username atau email.
3. Masukkan password.
4. Tekan **Masuk**.
5. Sistem akan mengarahkan pengguna ke dashboard sesuai role.

Tujuan dashboard setiap role:

| Role | Dashboard |
| --- | --- |
| Root | `/system/dashboard` |
| Operator Sekolah | `/admin/dashboard` |
| Guru | `/teacher/dashboard` |
| Wali Kelas | `/teacher/dashboard` |
| Kepala Sekolah | `/principal/dashboard` |
| Orang Tua | `/parent/dashboard` |

Jika akun memakai password default, pengguna wajib membuat password baru sebelum melanjutkan.

### 1.2 Lupa Password

1. Pada halaman login, pilih menu lupa password.
2. Masukkan username atau email akun.
3. Kirim permintaan reset.
4. Permintaan akan diterima oleh petugas yang berwenang.
5. Setelah password dikembalikan ke password default, login kembali.
6. Buat password baru saat diminta.

Reset password akan mencabut sesi aktif sebelumnya.

### 1.3 Profil dan Keamanan Akun

Menu **Profil** selalu berada pada bagian paling kanan navigasi utama.

Dari halaman Profil, pengguna dapat:

- melihat identitas akun;
- mengganti foto profil;
- mengganti password;
- mengaktifkan atau mengganti akun Telegram;
- melihat sesi login yang masih aktif;
- keluar dari semua perangkat.

Jangan membagikan password, kode aktivasi Telegram, atau akses perangkat kepada pengguna lain.

### 1.4 Mengaktifkan Telegram

1. Buka **Profil**.
2. Pilih aktivasi Telegram.
3. Sistem membuat token aktivasi dan membuka bot Telegram EduFlow.
4. Jalankan perintah `/start <token>` pada bot.
5. Kembali ke EduFlow dan periksa status Telegram.

Telegram dipakai untuk menerima pengingat atau ringkasan sesuai role. ID Telegram tidak diisi manual oleh operator.

### 1.5 Inbox/Notifikasi

Badge atau titik pada menu **Inbox** menandakan ada notifikasi pribadi yang belum dibaca.

Langkah umum:

1. Buka **Inbox**.
2. Pilih notifikasi yang ingin dibaca.
3. Periksa isi, waktu, dan tindakan yang diminta.
4. Buka fitur terkait apabila notifikasi membutuhkan tindak lanjut.

### 1.6 Ganti Tema

EduFlow mendukung mode terang dan gelap. Preferensi tema tersimpan pada browser yang digunakan.

### 1.7 Akses Ditolak

Jika pengguna membuka alamat milik role lain, sistem akan menampilkan peringatan lalu mengarahkan kembali ke dashboard role pengguna. Hubungi pengelola sistem apabila menu yang seharusnya tersedia tidak muncul.

---

# 2. Manual Guide Root

## 2.1 Fungsi Root

Root adalah role support teknis dan super admin sistem. Root tidak digunakan untuk pekerjaan akademik harian.

Tanggung jawab utama:

- memeriksa kesehatan sistem;
- memonitor queue dan worker;
- menangani failed job;
- mengelola user, role, dan permission;
- mengelola integrasi Telegram;
- membaca audit trail;
- menjalankan backup dan recovery;
- membantu reset akses pengguna.

## 2.2 Menu Utama Root

- **Sistem**: ringkasan kondisi aplikasi.
- **Ops**: health check, queue, worker, dan failed job.
- **Akses**: user, role, dan permission.
- **Telegram**: konfigurasi webhook bot.
- **Audit**: jejak aktivitas sistem.
- **Inbox**: notifikasi operasional.
- **Profil**: akun dan keamanan pribadi.

## 2.3 Pemeriksaan Sistem Harian

1. Login sebagai Root.
2. Buka **Sistem** atau `/system/dashboard`.
3. Pastikan frontend, backend, database, Redis, worker, dan layanan pendukung terdeteksi normal.
4. Buka **Ops**.
5. Periksa antrean job dan failed job.
6. Periksa Inbox untuk kegagalan penting atau permintaan reset password.
7. Catat dan tindak lanjuti anomali melalui audit atau log operasional.

## 2.4 Menangani Failed Job

1. Buka **Ops**.
2. Pilih antrean atau failed job.
3. Baca jenis job, waktu kegagalan, dan pesan error.
4. Pastikan penyebab awal sudah diperbaiki, misalnya konfigurasi provider atau koneksi layanan.
5. Jalankan retry hanya jika aman.
6. Periksa kembali status job setelah retry.

Jangan melakukan retry berulang tanpa memahami penyebab kegagalan karena dapat menimbulkan pengiriman ganda.

## 2.5 Mengelola User dan Hak Akses

1. Buka **Akses** atau `/system/access`.
2. Cari pengguna berdasarkan nama, username, atau email.
3. Periksa role yang dimiliki.
4. Tambah atau ubah role sesuai tugas resmi pengguna.
5. Pastikan permission tidak melebihi kebutuhan pekerjaan.
6. Simpan perubahan.
7. Minta pengguna login ulang jika perubahan belum terlihat.

Prinsip penting:

- role adalah kumpulan permission;
- berikan akses minimum yang diperlukan;
- jangan memakai akun Root untuk operasional akademik;
- wali kelas tetap harus memiliki role guru;
- perubahan akses penting harus dapat ditelusuri melalui audit.

## 2.6 Reset Password Pengguna

1. Buka **Akses**.
2. Cari pengguna.
3. Pilih tindakan reset password.
4. Konfirmasi reset ke password default.
5. Informasikan kepada pengguna melalui kanal yang aman.
6. Pengguna wajib mengganti password saat login berikutnya.

## 2.7 Mengelola Telegram Webhook

1. Buka **Telegram** atau `/system/telegram`.
2. Periksa apakah konfigurasi bot tersedia.
3. Lihat status webhook.
4. Pasang ulang webhook jika belum aktif atau URL berubah.
5. Gunakan informasi webhook untuk mendiagnosis error.
6. Jangan menampilkan atau membagikan token bot.

## 2.8 Audit Trail

Gunakan menu **Audit** untuk memeriksa:

- perubahan hak akses;
- perubahan data penting;
- tindakan approval;
- revisi jadwal;
- aktivitas recovery;
- tindakan operasional yang perlu ditelusuri.

Gunakan filter waktu, pengguna, atau jenis aksi agar pencarian lebih cepat.

## 2.9 Backup dan Recovery

Sebelum recovery:

1. Pastikan masalah benar-benar membutuhkan pemulihan data.
2. Verifikasi backup yang akan digunakan.
3. Catat waktu, alasan, dan penanggung jawab tindakan.
4. Hindari menjalankan restore saat transaksi sekolah masih aktif.
5. Setelah restore, periksa database, login, agenda, presensi, dan job queue.

Recovery bersifat sensitif dan hanya dilakukan oleh petugas teknis yang memahami dampaknya.

---

# 3. Manual Guide Operator Sekolah

## 3.1 Fungsi Operator Sekolah

Operator Sekolah mengelola konfigurasi dan operasional akademik, meliputi:

- tahun ajaran dan semester;
- kelas atau rombongan belajar;
- mata pelajaran;
- data guru dan siswa;
- penugasan guru;
- wali kelas;
- kalender pendidikan;
- jam pelajaran;
- jadwal sekolah;
- generate agenda harian;
- monitoring kesiapan operasional;
- Notification Center operasional.

## 3.2 Menu Utama Operator

- **Beranda**: kesiapan data dan operasional akademik.
- **Master**: pusat data administrasi akademik.
- **Jadwal**: susunan jadwal dan generate agenda.
- **Inbox**: notifikasi pribadi dan operasional.
- **Profil**: akun dan preferensi.

Route penting:

| Halaman | Fungsi |
| --- | --- |
| `/admin/data` | Menu utama master administrasi |
| `/admin/guru` | Data guru, akun, role, penugasan, mapel, dan wali kelas |
| `/admin/akademik` | Tahun ajaran, kelas, mapel, dan jam pelajaran |
| `/admin/akademik/kalender` | Kalender pendidikan |
| `/admin/schedules` | Jadwal sekolah dan generate agenda |
| `/admin/import-data` | Import Guru.xlsx dan Siswa.xlsx |

## 3.3 Urutan Setup Tahun Ajaran

Lakukan konfigurasi dalam urutan berikut:

1. Buat atau pilih tahun ajaran.
2. Pastikan semester Ganjil dan Genap tersedia.
3. Buat atau salin master kelas.
4. Atur jam pelajaran dan kegiatan tetap.
5. Atur kalender pendidikan.
6. Tambahkan mata pelajaran.
7. Import atau lengkapi data guru dan siswa.
8. Hubungkan guru dengan akun login.
9. Atur status penugasan dan mapel ampu guru.
10. Tetapkan wali kelas.
11. Susun jadwal.
12. Periksa konflik dan kelengkapan jadwal.
13. Generate agenda harian.

## 3.4 Mengelola Tahun Ajaran dan Semester

1. Buka **Master** → area akademik.
2. Pilih pengelolaan tahun ajaran.
3. Masukkan format berurutan, misalnya `2026/2027`.
4. Simpan.
5. Pastikan semester Ganjil dan Genap dibuat oleh sistem.

Tahun ajaran baru tidak otomatis menyalin jadwal, agenda, presensi, atau penugasan guru lama.

Gunakan **Salin Master Tahun Ajaran** jika ingin menyalin:

- kelas;
- susunan jam pelajaran;
- aktivitas slot.

Setelah menyalin master, jadwal dan penugasan guru tetap harus disiapkan untuk tahun ajaran baru.

## 3.5 Mengelola Kelas

1. Buka `/admin/akademik`.
2. Pilih tahun ajaran.
3. Tambahkan tingkat dan rombel yang diperlukan.
4. Simpan.
5. Pastikan urutan kelas tampil VII, VIII, IX kemudian A, B, C, dan seterusnya.

Kelas tidak dapat dihapus jika sudah memiliki siswa, histori enrollment, jadwal, atau agenda.

## 3.6 Mengelola Mata Pelajaran

1. Buka `/admin/akademik`.
2. Tambahkan mata pelajaran nasional atau muatan lokal.
3. Simpan.
4. Hubungkan mata pelajaran dengan guru melalui halaman manajemen guru.

Mata pelajaran yang sudah dipakai jadwal atau agenda tidak dapat dihapus.

## 3.7 Mengelola Jam Pelajaran

1. Buka `/admin/akademik`.
2. Pilih tahun ajaran.
3. Buka area jam pelajaran.
4. Tambahkan nomor jam, waktu mulai, waktu selesai, dan jenis slot.
5. Tentukan apakah slot dapat digunakan untuk jadwal pelajaran.
6. Simpan.

Kegiatan tetap seperti Upacara, Senam, Istirahat, atau Sholat Berjamaah dapat dibuat sebagai slot non-pelajaran.

Slot yang sudah dipakai tidak dapat dihapus agar histori tetap aman.

## 3.8 Mengelola Kalender Pendidikan

1. Buka `/admin/akademik/kalender`.
2. Pilih tahun ajaran.
3. Tambahkan event seperti libur, ujian, asesmen, kegiatan sekolah, atau hari non-KBM.
4. Isi judul dan rentang tanggal.
5. Aktifkan **Blokir pembuatan agenda** untuk tanggal tanpa pembelajaran reguler.
6. Simpan.

Perubahan kalender tidak otomatis menghapus agenda yang sudah dibuat. Periksa agenda bila kalender diubah setelah proses generate.

## 3.9 Import Data Guru dan Siswa

1. Buka `/admin/import-data`.
2. Pilih jenis data Guru atau Siswa.
3. Gunakan file dengan struktur template yang ditentukan.
4. Unggah file Excel.
5. Periksa hasil validasi.
6. Koreksi data yang ditolak.
7. Jalankan import.
8. Periksa kembali data hasil import.

Import massal hanya untuk `Guru.xlsx` dan `Siswa.xlsx`. Kelas, mata pelajaran, role, mapel ampu, wali kelas, dan jadwal diatur melalui aplikasi agar dapat diaudit.

## 3.10 Membuat atau Melengkapi Akun Guru

1. Buka `/admin/guru`.
2. Pilih guru atau tambahkan data guru baru.
3. Lengkapi nama, NIP, NUPTK, nomor HP, email, dan foto jika tersedia.
4. Isi username atau email untuk login.
5. Pilih role guru.
6. Pilih tahun ajaran penugasan.
7. Tentukan status penugasan.
8. Pilih mata pelajaran yang diampu.
9. Bila menjadi wali kelas, pilih kelas binaan.
10. Simpan.

Aturan:

- wali kelas harus tetap memiliki role guru;
- satu guru dapat mengampu lebih dari satu mata pelajaran;
- mapel ampu menentukan mata pelajaran yang boleh ditugaskan;
- jadwal menentukan kelas dan jam mengajar sebenarnya;
- Telegram diaktifkan sendiri oleh pengguna melalui Profil.

## 3.11 Menyusun Jadwal

1. Buka `/admin/schedules`.
2. Pilih tahun ajaran dan semester.
3. Pilih guru beserta mata pelajarannya.
4. Pilih tingkat kelas.
5. Pilih hari.
6. Klik slot jam yang akan digunakan.
7. Pilih satu atau beberapa rombel untuk setiap slot.
8. Simpan jadwal.

Sistem akan menolak bentrok guru atau bentrok kelas.

Gunakan tabel jadwal untuk:

- memilih kelas;
- melihat kondisi jadwal pada tanggal tertentu;
- memfilter hari;
- mengedit jadwal;
- membuat revisi dengan tanggal mulai berlaku;
- mengisi alasan revisi;
- melihat atau membatalkan histori revisi.

## 3.12 Generate Agenda Harian

1. Buka `/admin/schedules`.
2. Pilih kelas atau gunakan opsi semua kelas VII–IX.
3. Isi tanggal mulai dan tanggal selesai.
4. Pastikan kalender pendidikan sudah benar.
5. Klik **Generate Agenda Kelas** atau **Generate Semua Kelas VII-IX**.
6. Periksa hasil generate dan tanggal yang dilewati.

Agenda tidak dibuat pada tanggal yang diblokir oleh kalender pendidikan.

## 3.13 Checklist Sebelum KBM

Sebelum kegiatan belajar berjalan, pastikan:

- tahun ajaran dan semester benar;
- kelas tersedia;
- siswa sudah terdaftar pada kelas;
- guru aktif memiliki mapel ampu;
- wali kelas sudah ditetapkan;
- slot jam sekolah lengkap;
- kalender pendidikan lengkap;
- jadwal tidak bentrok;
- agenda harian sudah dibuat;
- akun guru dapat login;
- Telegram pengguna penting sudah aktif.

## 3.14 Monitoring dan Notification Center

Operator dapat memeriksa:

- pengiriman notifikasi;
- status pending, terkirim, atau gagal;
- job operasional;
- kebutuhan retry;
- notifikasi presensi atau agenda yang belum selesai.

Sebelum retry, pastikan kegagalan tidak disebabkan oleh data penerima yang salah atau provider yang masih bermasalah.

## 3.15 Perintah Telegram Operator

Setelah Telegram aktif, operator dapat menggunakan:

- `/kbm` atau `/today` untuk ringkasan KBM hari ini;
- `/review` untuk melihat antrean perangkat ajar dan nilai yang menunggu review.

Perintah ini bersifat on-demand dan tidak menambah badge Inbox.

---

# 4. Manual Guide Guru

## 4.1 Fungsi Guru

Guru menggunakan EduFlow untuk:

- melihat agenda dan jadwal pribadi;
- menerima reminder sebelum kelas;
- membuka kelas;
- mengisi dan submit presensi;
- menindaklanjuti permintaan koreksi;
- mengelola perangkat ajar;
- mengelola nilai siswa;
- membaca notifikasi pribadi.

Guru hanya dapat mengakses kelas dan mata pelajaran yang ditugaskan kepadanya.

## 4.2 Menu Utama Guru

- **Hari Ini**: agenda dan prioritas hari berjalan.
- **Jadwal**: jadwal mengajar pribadi.
- **Presensi**: membuka kelas dan mengisi presensi.
- **Inbox**: reminder, koreksi, dan keputusan review.
- **Profil**: akun, password, Telegram, foto, dan sesi.

## 4.3 Melihat Agenda Hari Ini

1. Login sebagai Guru.
2. Buka **Hari Ini**.
3. Periksa kelas, mata pelajaran, jam mulai, dan status agenda.
4. Pilih agenda yang akan dilaksanakan.
5. Perhatikan reminder atau peringatan presensi yang belum selesai.

## 4.4 Melihat Jadwal Pribadi

1. Buka **Jadwal** atau `/teacher/schedules`.
2. Pilih hari atau periode jika filter tersedia.
3. Periksa kelas, mata pelajaran, dan jam mengajar.
4. Gunakan jadwal yang tampil sebagai acuan karena sistem sudah memperhitungkan revisi jadwal yang berlaku.

Guru tidak dapat mengubah jadwal sekolah dari halaman ini. Laporkan kesalahan kepada Operator Sekolah.

## 4.5 Alur Presensi Kelas

Alur normal:

```text
Reminder diterima
  -> Guru membuka agenda kelas
  -> Presensi dibuat/dibuka
  -> Guru mengisi status siswa
  -> Guru memeriksa data
  -> Guru submit
  -> Ringkasan diproses sistem
```

Langkah penggunaan:

1. Buka **Presensi** atau `/teacher/attendance`.
2. Pilih agenda kelas yang sedang berlangsung.
3. Tekan tombol untuk membuka kelas atau memulai presensi.
4. Periksa daftar siswa.
5. Isi status setiap siswa sesuai kondisi sebenarnya.
6. Tambahkan catatan jika diperlukan.
7. Pastikan tidak ada siswa yang terlewat.
8. Tekan **Submit**.
9. Periksa konfirmasi bahwa presensi berhasil dikirim.

Jangan submit data perkiraan. Koreksi harus mengikuti alur koreksi agar perubahan tercatat.

## 4.6 Menangani Permintaan Koreksi Presensi

1. Buka **Inbox**.
2. Pilih notifikasi permintaan koreksi.
3. Baca alasan dan bagian yang harus diperbaiki.
4. Buka presensi terkait.
5. Perbaiki data sesuai kondisi sebenarnya.
6. Isi catatan koreksi bila diminta.
7. Submit ulang.
8. Periksa status terbaru.

## 4.7 Perangkat Ajar

Perangkat ajar dapat meliputi:

- Program Tahunan;
- Program Semester;
- KKTP;
- Perencanaan Pembelajaran;
- buku atau referensi KBM.

Alur umum:

```text
Guru membuat atau mengunggah dokumen
  -> Draft
  -> Guru submit
  -> Kepala Sekolah review
  -> Disetujui atau diminta revisi
  -> Jika revisi, guru memperbaiki dan submit ulang
```

Langkah penggunaan:

1. Buka area perangkat ajar dari dashboard Guru.
2. Pilih tahun ajaran, semester, dan mata pelajaran.
3. Buat atau unggah dokumen.
4. Simpan sebagai Draft jika belum selesai.
5. Periksa kelengkapan dokumen.
6. Submit untuk review.
7. Pantau status melalui halaman perangkat ajar atau Inbox.
8. Bila diminta revisi, baca catatan Kepala Sekolah, perbaiki, lalu submit ulang.

## 4.8 Mengelola Nilai Siswa

1. Buka area Penilaian.
2. Pilih kelas, mata pelajaran, semester, dan komponen penilaian.
3. Masukkan nilai siswa.
4. Simpan sebagai Draft jika belum lengkap.
5. Periksa kembali nilai dan siswa yang belum terisi.
6. Submit sesuai alur yang tersedia.
7. Pantau hasil review atau permintaan revisi di Inbox.
8. Gunakan tombol **Preview Bulanan** atau **Preview Semester** untuk memeriksa rekap nilai kelas/mapel yang sedang dipilih.
9. Jika preview sudah sesuai, klik **Download Excel**.

Guru hanya dapat mengelola nilai pada kelas dan mata pelajaran yang diampu.

File Excel nilai harian berisi sheet `Rekap`, `Komponen`, dan `Catatan` agar daftar siswa tetap ringkas tetapi detail komponen serta nilai yang belum lengkap tetap terlihat.

Nilai yang sudah disetujui dan dikunci tidak dapat diubah melalui proses biasa.

## 4.9 Notifikasi Guru

Inbox Guru dapat berisi:

- reminder sebelum kelas;
- presensi belum disubmit;
- permintaan koreksi presensi;
- perangkat ajar diminta revisi atau disetujui;
- nilai diminta revisi atau disetujui;
- pengumuman akademik.

Guru tidak dapat melihat log pengiriman seluruh sekolah, data penerima lain, status provider global, failed job, atau tombol retry queue.

## 4.10 Rutinitas Harian Guru

Sebelum mengajar:

1. Periksa **Hari Ini** dan **Inbox**.
2. Pastikan jadwal dan ruang kelas benar.
3. Siapkan materi dan perangkat ajar.

Saat pelajaran:

1. Buka agenda kelas.
2. Mulai kelas dan isi presensi.
3. Lengkapi catatan kegiatan jika tersedia.

Setelah pelajaran:

1. Periksa kembali presensi.
2. Submit presensi.
3. Pastikan tidak ada agenda yang tertinggal.
4. Tindak lanjuti notifikasi koreksi atau review.

---

# 5. Manual Guide Wali Kelas

## 5.1 Fungsi Wali Kelas

Wali Kelas adalah tugas tambahan seorang Guru. Akun Wali Kelas tetap menggunakan pekerjaan harian Guru, dengan tambahan akses baca dan monitoring kelas binaan.

Wali Kelas dapat:

- menjalankan seluruh pekerjaan Guru sesuai penugasan mengajar;
- melihat siswa kelas binaan;
- memantau presensi kelas binaan;
- melihat ringkasan akademik siswa;
- menindaklanjuti masalah kelas;
- membaca laporan dan notifikasi yang terkait kelas binaan.

## 5.2 Menu Utama Wali Kelas

- **Hari Ini**
- **Jadwal**
- **Presensi**
- **Binaan**
- **Inbox**
- **Profil**

Menu **Binaan** mengarah ke `/homeroom/students`.

## 5.3 Melihat Kelas Binaan

1. Buka **Binaan**.
2. Periksa identitas kelas dan tahun ajaran.
3. Lihat daftar siswa aktif.
4. Pilih siswa untuk melihat ringkasan yang tersedia.
5. Gunakan data hanya untuk kepentingan pembinaan kelas.

Wali Kelas hanya dapat melihat kelas yang secara resmi ditetapkan kepadanya.

## 5.4 Monitoring Presensi Kelas

1. Buka **Binaan**.
2. Pilih ringkasan presensi.
3. Periksa siswa yang sering tidak hadir, terlambat, atau memiliki catatan.
4. Pastikan data berasal dari presensi yang sudah disubmit.
5. Lakukan tindak lanjut sesuai kebijakan sekolah.
6. Koordinasikan koreksi data dengan Guru pengampu atau Operator jika ditemukan kesalahan.

Wali Kelas tidak mengubah presensi mata pelajaran yang bukan tanggung jawabnya tanpa alur yang sah.

## 5.5 Monitoring Nilai dan Perkembangan Siswa

1. Pilih siswa pada kelas binaan.
2. Buka ringkasan nilai atau laporan akademik.
3. Periksa kelengkapan nilai tiap mata pelajaran.
4. Identifikasi siswa yang memerlukan tindak lanjut.
5. Koordinasikan dengan Guru mata pelajaran.
6. Gunakan laporan sebagai bahan komunikasi dengan orang tua.

## 5.6 Tindak Lanjut Kelas

Gunakan informasi kelas binaan untuk:

- memastikan presensi lengkap;
- mengingatkan siswa terkait kehadiran;
- mengoordinasikan nilai yang belum lengkap;
- menyampaikan informasi akademik;
- menindaklanjuti kendala kelas;
- menyiapkan ringkasan untuk rapat atau komunikasi orang tua.

Jaga kerahasiaan data siswa dan hindari membagikan laporan melalui kanal yang tidak resmi.

## 5.7 Pekerjaan Mengajar

Untuk pekerjaan mengajar, Wali Kelas mengikuti panduan Guru:

- melihat jadwal pribadi;
- membuka kelas;
- mengisi presensi;
- mengelola perangkat ajar;
- mengelola nilai;
- menindaklanjuti Inbox.

Status sebagai Wali Kelas tidak membatasi kelas lain yang memang diajar berdasarkan jadwal.

---

# 6. Manual Guide Kepala Sekolah

## 6.1 Fungsi Kepala Sekolah

Kepala Sekolah menggunakan EduFlow untuk monitoring, review, approval, dan pengambilan keputusan.

Tanggung jawab utama:

- memonitor pelaksanaan KBM;
- melihat kelas kosong dan presensi belum submit;
- memeriksa kendala dan guru pengganti;
- mereview perangkat ajar;
- menyetujui atau meminta revisi nilai semester;
- memonitor performa guru;
- melihat laporan sekolah;
- membaca audit supervisi;
- menerima notifikasi keputusan penting.

## 6.2 Menu Utama Kepala Sekolah

- **Beranda**: prioritas dan ringkasan sekolah.
- **Review**: perangkat ajar dan nilai yang menunggu keputusan.
- **Performa**: monitoring guru.
- **Inbox**: notifikasi yang membutuhkan perhatian.
- **Profil**: akun dan Telegram.

Route penting:

| Halaman | Fungsi |
| --- | --- |
| `/principal/dashboard` | Beranda dan prioritas |
| `/principal/kbm` | Monitoring KBM harian |
| `/principal/student-reports` | Laporan siswa, presensi, dan nilai |
| `/principal/exports` | Unduh laporan Excel/PDF |
| `/principal/review` | Approval perangkat ajar dan nilai |
| `/principal/teacher-performance` | Performa guru |
| `/principal/audit` | Jejak aktivitas supervisi |

## 6.3 Pemeriksaan Dashboard Harian

1. Login sebagai Kepala Sekolah.
2. Buka **Beranda**.
3. Periksa prioritas dengan urutan:
   - kelas kosong;
   - presensi belum disubmit;
   - kendala KBM;
   - checklist yang belum lengkap;
   - kebutuhan guru pengganti.
4. Buka item prioritas untuk melihat detail.
5. Tindak lanjuti melalui pihak yang bertanggung jawab.
6. Setelah prioritas aman, periksa statistik pendukung.

## 6.4 Monitoring KBM

1. Buka `/principal/kbm`.
2. Pilih tanggal bila diperlukan.
3. Periksa status kelas dan agenda.
4. Identifikasi kelas kosong, agenda belum dibuka, atau presensi belum submit.
5. Periksa catatan kendala dan guru pengganti.
6. Koordinasikan tindak lanjut dengan Operator atau Guru.

## 6.5 Review Perangkat Ajar

1. Buka **Review** atau `/principal/review`.
2. Pilih dokumen berstatus menunggu review.
3. Periksa guru, mata pelajaran, tahun ajaran, dan jenis dokumen.
4. Baca atau unduh dokumen.
5. Nilai kelengkapan dan kesesuaian.
6. Pilih salah satu tindakan:
   - **Approve/Setujui** bila layak;
   - **Minta Revisi** bila perlu perbaikan.
7. Bila meminta revisi, tulis catatan yang spesifik dan dapat ditindaklanjuti.
8. Simpan keputusan.

Guru akan menerima keputusan melalui Inbox.

## 6.6 Approval Nilai Semester

1. Buka antrean nilai pada **Review**.
2. Pilih kelas, mata pelajaran, atau guru.
3. Periksa kelengkapan nilai.
4. Periksa catatan validasi jika tersedia.
5. Pilih:
   - **Approve** jika nilai siap difinalkan;
   - **Minta Revisi** jika masih ada kesalahan atau kekurangan.
6. Isi catatan keputusan.
7. Simpan.
8. Pastikan nilai yang sudah final masuk status dikunci sesuai alur sekolah.

Koreksi nilai setelah dikunci harus melalui kewenangan khusus dan tercatat dalam audit.

## 6.7 Monitoring Performa Guru

1. Buka **Performa** atau `/principal/teacher-performance`.
2. Pilih periode.
3. Periksa indikator seperti:
   - pelaksanaan agenda;
   - ketepatan submit presensi;
   - kelengkapan perangkat ajar;
   - status review;
   - kelengkapan nilai;
   - kendala atau tindak lanjut.
4. Buka detail guru jika diperlukan.
5. Gunakan data sebagai bahan supervisi, bukan satu-satunya dasar penilaian.

## 6.8 Laporan Siswa dan Sekolah

1. Buka `/principal/student-reports`.
2. Pilih kelas, siswa, atau periode.
3. Periksa ringkasan presensi dan nilai.
4. Gunakan filter untuk mempersempit laporan.
5. Bila perlu, buka `/principal/exports`.
6. Pilih format Excel atau PDF yang tersedia.
7. Pastikan laporan hanya dibagikan kepada pihak berwenang.

## 6.9 Audit Supervisi

1. Buka `/principal/audit`.
2. Filter berdasarkan waktu, guru, atau jenis aktivitas.
3. Periksa histori review, approval, revisi, atau tindak lanjut.
4. Gunakan audit untuk memastikan proses keputusan dapat ditelusuri.

## 6.10 Inbox Kepala Sekolah

Inbox dapat berisi:

- perangkat ajar menunggu persetujuan;
- nilai menunggu persetujuan;
- kelas kosong;
- guru belum submit presensi;
- koreksi presensi penting;
- penugasan guru pengganti;
- ringkasan operasional;
- pengumuman akademik.

Kepala Sekolah tidak menangani payload queue, provider global, failed job teknis, atau tombol retry.

## 6.11 Perintah Telegram Kepala Sekolah

Setelah Telegram aktif:

- gunakan `/kbm` atau `/today` untuk ringkasan KBM hari ini;
- gunakan `/review` untuk antrean perangkat ajar dan nilai.

---

# 7. Manual Guide Orang Tua/Wali Murid

## 7.1 Fungsi Orang Tua

Orang Tua menggunakan EduFlow untuk melihat informasi anak yang terhubung dengan akun, seperti:

- ringkasan anak;
- presensi;
- nilai atau laporan akademik yang tersedia;
- riwayat informasi;
- pengumuman sekolah;
- notifikasi pribadi.

Orang Tua hanya dapat melihat data anaknya sendiri.

## 7.2 Menu Utama Orang Tua

- **Anak**: dashboard dan ringkasan anak.
- **Inbox**: notifikasi presensi dan pengumuman.
- **Riwayat**: laporan atau histori yang tersedia.
- **Info**: informasi sekolah.
- **Profil**: akun, password, Telegram, dan sesi.

Route utama:

- `/parent/dashboard`
- `/parent/reports`
- `/parent/info`

## 7.3 Melihat Ringkasan Anak

1. Login sebagai Orang Tua.
2. Buka **Anak**.
3. Pilih anak jika akun terhubung dengan lebih dari satu siswa.
4. Periksa kelas, ringkasan presensi, dan informasi akademik.
5. Buka detail yang diperlukan.

Jika data anak tidak muncul atau salah, hubungi sekolah. Jangan membuat akun lain untuk mencoba mengakses data.

## 7.4 Melihat Presensi

1. Buka **Anak** atau **Riwayat**.
2. Pilih periode.
3. Periksa status kehadiran.
4. Baca catatan jika tersedia.
5. Hubungi Wali Kelas melalui kanal resmi sekolah apabila ada data yang perlu diklarifikasi.

Orang Tua tidak dapat mengubah presensi secara langsung.

## 7.5 Melihat Nilai atau Laporan

1. Buka **Riwayat** atau `/parent/reports`.
2. Pilih anak dan periode.
3. Periksa nilai atau ringkasan yang sudah tersedia.
4. Gunakan informasi sebagai bahan pendampingan belajar.
5. Hubungi Guru/Wali Kelas melalui prosedur sekolah bila membutuhkan penjelasan.

Nilai yang masih Draft atau belum dipublikasikan mungkin belum muncul.

## 7.6 Inbox Orang Tua

Inbox Orang Tua dapat memuat:

- ringkasan presensi anak;
- informasi ketidakhadiran;
- pengumuman akademik;
- informasi sekolah yang ditujukan kepada wali murid.

Notifikasi hanya diterima bila data kontak wali sesuai dengan akun login dan terhubung dengan siswa.

## 7.7 Melihat Informasi Sekolah

1. Buka **Info** atau `/parent/info`.
2. Pilih pengumuman.
3. Periksa tanggal, isi, dan instruksi.
4. Ikuti kanal resmi bila pengumuman memerlukan konfirmasi lanjutan.

## 7.8 Keamanan Data Anak

- Jangan membagikan screenshot nilai atau data pribadi anak secara terbuka.
- Gunakan akun sendiri, bukan akun milik siswa atau wali lain.
- Segera ganti password jika akun diduga digunakan orang lain.
- Gunakan **Keluar dari semua perangkat** melalui Profil bila kehilangan perangkat.

---

# 8. Ringkasan Alur Antar-Role

## 8.1 Alur Persiapan Akademik

```text
Root memastikan sistem dan akses siap
  -> Operator menyiapkan tahun ajaran, kelas, guru, siswa, Kaldik, dan jadwal
  -> Operator generate agenda
  -> Guru melihat agenda dan melaksanakan KBM
```

## 8.2 Alur Presensi

```text
Sistem mengirim reminder Guru
  -> Guru membuka kelas
  -> Guru mengisi presensi
  -> Guru submit
  -> Wali Kelas/Kepala Sekolah memonitor
  -> Orang Tua menerima ringkasan yang ditujukan kepadanya
```

## 8.3 Alur Perangkat Ajar

```text
Guru membuat Draft
  -> Guru submit
  -> Kepala Sekolah review
  -> Approve atau Minta Revisi
  -> Guru menerima notifikasi
  -> Jika revisi, Guru memperbaiki dan submit ulang
```

## 8.4 Alur Nilai

```text
Guru mengisi nilai
  -> Simpan Draft
  -> Submit
  -> Pemeriksaan kelengkapan
  -> Kepala Sekolah approve atau minta revisi
  -> Nilai final dikunci
  -> Laporan tersedia sesuai kewenangan
```

---

# 9. Troubleshooting Pengguna

## 9.1 Tidak Bisa Login

Periksa:

- username atau email benar;
- Caps Lock tidak aktif;
- password sesuai;
- jaringan perangkat tersedia;
- akun belum dinonaktifkan.

Gunakan fitur lupa password jika diperlukan.

## 9.2 Menu Tidak Muncul

Kemungkinan penyebab:

- role belum diberikan;
- permission belum sesuai;
- penugasan tahun ajaran belum dibuat;
- akun perlu login ulang;
- data scope belum terhubung, misalnya guru belum terhubung dengan jadwal atau wali kelas belum ditetapkan.

Hubungi Operator untuk masalah penugasan akademik atau Root untuk masalah akses teknis.

## 9.3 Jadwal Guru Tidak Muncul

Periksa bersama Operator:

- akun login sudah terhubung dengan profil Guru;
- status penugasan aktif;
- mata pelajaran sudah ditetapkan;
- jadwal menggunakan Guru yang benar;
- tahun ajaran dan tanggal efektif revisi sesuai.

## 9.4 Agenda atau Presensi Tidak Tersedia

Periksa:

- agenda sudah digenerate;
- tanggal tidak diblokir Kalender Pendidikan;
- jadwal berlaku pada tanggal tersebut;
- agenda terhubung dengan Guru yang login;
- kelas dan enrollment siswa aktif.

## 9.5 Notifikasi Tidak Masuk Telegram

Periksa:

- Telegram sudah aktif di Profil;
- bot sudah menerima `/start <token>`;
- akun Telegram yang digunakan benar;
- notifikasi memang ditujukan kepada pengguna;
- Root telah memastikan webhook aktif.

## 9.6 Data Salah

Jangan membuat data pengganti untuk menutupi kesalahan. Laporkan kepada role yang berwenang:

- jadwal, kelas, guru, siswa, Kaldik: Operator Sekolah;
- presensi: Guru pengampu melalui alur koreksi;
- kelas binaan: Wali Kelas dan Operator;
- perangkat ajar atau nilai: Guru dan Kepala Sekolah;
- akun, role, permission, atau sistem: Root.

---

# 10. Kontrol dan Kepatuhan

Setiap pengguna wajib:

- memakai akun sendiri;
- menjaga kerahasiaan password;
- mengakses data hanya untuk tugas resmi;
- memeriksa data sebelum submit atau approve;
- menggunakan alur koreksi resmi;
- tidak membagikan data siswa secara sembarangan;
- keluar dari perangkat bersama setelah selesai;
- melaporkan dugaan akses tidak sah.

Seluruh tindakan penting dapat dicatat dalam audit trail sesuai konfigurasi sistem.
