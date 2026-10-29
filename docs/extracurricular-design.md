# Rancangan Modul Ekstrakurikuler EduFlow

## Tujuan dan batasan

Ekstrakurikuler adalah kegiatan pengembangan minat/bakat di luar mata pelajaran dan tidak dimasukkan ke jadwal KBM reguler, penilaian mata pelajaran, atau presensi pembelajaran. Modul ini memakai tahun ajaran aktif agar daftar program dan peserta dapat berubah antar tahun ajaran tanpa menghapus riwayat.

## Peran

- **Operator Sekolah (Opsek):** membuat/mengubah program ekskul, menetapkan pembimbing, menentukan peserta, mengatur aturan kepesertaan, jadwal kegiatan dan status aktif.
- **Guru:** melihat ekskul yang dibimbing, daftar peserta, dan jadwal kegiatan; tidak perlu menjadi guru mapel untuk menjadi pembimbing. Guru tetap dapat merangkap wali kelas dan pembimbing ekskul.
- **Siswa:** menjadi peserta berdasarkan kebijakan program. Tahap awal pengelolaan peserta dilakukan oleh operator; pendaftaran mandiri dapat ditambahkan setelah alur akun siswa ditetapkan.
- **Kepala Sekolah:** akses baca ringkasan program, pembimbing, dan peserta.

## Aturan kepesertaan

1. **Pramuka:** kelas VII wajib terdaftar pada tahun ajaran aktif. Siswa kelas VIII/IX boleh ikut jika berminat. Sistem memberi label “Wajib (kelas VII)” dan mencegah operator menandai siswa kelas VII sebagai tidak ikut tanpa alur pengecualian yang disetujui sekolah.
2. **Ekskul selain Pramuka:** kepesertaan pilihan/minat; siswa hanya terdaftar jika dipilih atau mendaftar.
3. Aturan kelas ditentukan berdasarkan tingkat/grade rombel pada tahun ajaran yang dipilih, bukan dari nama kelas yang ditebak.
4. Jika data tingkat kelas belum tersedia atau tidak konsisten, sistem menandai data perlu diperiksa dan tidak otomatis menetapkan peserta wajib.
5. Peserta, pembimbing, dan jadwal disimpan per tahun ajaran. Perubahan tahun ajaran tidak menimpa riwayat tahun sebelumnya.

## Model data yang disarankan

### Extracurricular
- id, schoolYearId, name, code (opsional), description (opsional)
- category/type (mis. Pramuka, olahraga, seni, sains, keagamaan, lainnya)
- participationPolicy: MANDATORY_GRADE atau OPTIONAL
- mandatoryGrades: daftar tingkat wajib, saat ini [7] khusus Pramuka
- quota (opsional), location (opsional), dayOfWeek/jam (opsional)
- isActive, createdAt, updatedAt

### ExtracurricularAdvisor
Relasi program dengan satu atau lebih guru pembimbing. Mendukung pergantian pembimbing dan lebih dari satu pembimbing tanpa mengikat guru ke mapel tertentu.

### ExtracurricularEnrollment
- extracurricularId, studentId, status (ACTIVE, WITHDRAWN, COMPLETED)
- enrollmentType (MANDATORY atau VOLUNTARY)
- enrolledAt, notes (opsional)
- Unik per kombinasi program dan siswa agar tidak ada pendaftaran ganda.

Relasi peserta sebaiknya menunjuk enrollment siswa/tahun ajaran yang aktif agar siswa tidak bisa terdaftar pada program tahun ajaran yang berbeda secara tidak sengaja.

## Navigasi dan halaman

Tambahkan **Ekstrakurikuler** di navigasi Opsek, terpisah dari menu Jadwal dan Akademik.

### 1. Daftar program
- Ringkasan jumlah ekskul aktif, peserta aktif, dan program tanpa pembimbing.
- Filter tahun ajaran, status, dan kategori.
- Kartu/tabel menampilkan nama, pembimbing, jumlah peserta, jadwal ringkas, dan badge aturan kepesertaan.
- Tombol Tambah Ekskul.

### 2. Form tambah/edit program
- Nama, kode, kategori, deskripsi.
- Tahun ajaran dan status aktif.
- Kebijakan peserta: wajib berdasarkan tingkat atau pilihan.
- Jika Pramuka, tampilkan aturan default kelas VII wajib dan kelas lain pilihan; pengecualian hanya melalui alur yang tercatat.
- Pilih satu atau lebih guru pembimbing dari daftar guru aktif, tanpa memeriksa mapel ampu.
- Jadwal latihan/lokasi opsional dan kuota opsional.

### 3. Detail program
Tab Ringkasan, Peserta, Pembimbing, dan Jadwal.
- Daftar peserta dengan pencarian nama/NIS, filter kelas, label Wajib/Pilihan, dan status.
- Tambah peserta secara manual untuk ekskul pilihan.
- Untuk Pramuka, tombol aksi massal Sinkronkan peserta wajib kelas VII menambahkan siswa kelas VII aktif yang belum terdaftar; proses ini idempoten dan tidak menggandakan peserta.
- Kelas VIII/IX tetap bisa dipilih sebagai peserta sukarela.
- Pembimbing dapat melihat program terkait; perubahan master program hanya oleh Opsek.

## Alur yang disarankan
1. Opsek memilih tahun ajaran aktif lalu membuat program.
2. Opsek menetapkan aturan peserta dan pembimbing.
3. Untuk Pramuka, sistem menghitung siswa kelas VII yang wajib dan memberi ringkasan sebelum sinkronisasi.
4. Opsek mengonfirmasi penambahan peserta wajib; siswa kelas lain hanya ditambahkan secara sukarela.
5. Guru pembimbing membuka halaman ekskul untuk melihat program dan daftar peserta yang menjadi tanggung jawabnya.
6. Tahun ajaran ditutup dengan mengarsipkan program/keikutsertaan, bukan menghapusnya.

## Validasi dan keamanan
- Endpoint tulis dibatasi ke role/permission operator sekolah.
- Guru hanya melihat program yang ditugaskan sebagai pembimbing; kepala sekolah mendapat akses baca sesuai kebijakan aplikasi.
- Validasi tahun ajaran, guru aktif, siswa dengan enrollment aktif, dan aturan tingkat kelas dilakukan di backend.
- Penghapusan program yang memiliki riwayat peserta sebaiknya berupa nonaktif/arsip, bukan hard delete.
- Setiap perubahan peserta wajib/pengecualian dan pergantian pembimbing dicatat pada audit log.

## Tahapan implementasi
1. Fondasi: model Prisma, migrasi SQL, API CRUD program, pembimbing, dan peserta.
2. UI operator: daftar program, form, detail, peserta, pembimbing, sinkronisasi wajib Pramuka kelas VII.
3. Portal guru: daftar ekskul bimbingan dan peserta.
4. Penyempurnaan: jadwal pertemuan, presensi ekskul, laporan, dan pendaftaran minat mandiri bila akun siswa sudah tersedia.

Catatan: rancangan ini sengaja memisahkan data ekskul dari Subject, Schedule, dan DailyAgenda agar tidak mencampur kegiatan ekskul dengan KBM. Aturan wajib Pramuka perlu menggunakan field tingkat kelas yang tervalidasi; jangan bergantung hanya pada teks nama rombel.

## Rancangan presensi ekstrakurikuler

Presensi ekskul adalah alur tersendiri dari presensi KBM. Siswa tidak melakukan presensi mandiri; **guru pembimbing yang mencatat kehadiran anggota** pada setiap pertemuan. Guru yang ditugaskan sebagai pembimbing dapat melakukan presensi meskipun bukan guru mata pelajaran siswa atau wali kelasnya.

### Alur guru pembimbing
1. Guru membuka menu **Ekskul Saya** dan memilih program yang dibimbing.
2. Guru memilih pertemuan hari ini atau membuat sesi pertemuan baru jika jadwal sesi belum dibuat.
3. Sistem menampilkan daftar anggota aktif pada program tersebut, termasuk nama, kelas, dan status kepesertaan.
4. Guru menetapkan status setiap siswa: **Hadir**, **Sakit**, **Izin**, atau **Alpa**. Mengikuti alur presensi KBM EduFlow, saat sesi dibuat seluruh anggota aktif otomatis berstatus **Hadir**. Guru cukup mengubah siswa yang Sakit, Izin, atau Alpa. Status default ini harus terlihat jelas dan guru tetap memeriksa daftar sebelum submit.
5. Guru dapat menambahkan catatan per siswa dan catatan umum pertemuan, lalu menyimpan presensi.
6. Sebelum dikirim/finalisasi, guru melihat ringkasan jumlah hadir, sakit, izin, alpa, dan belum diisi.
7. Setelah difinalisasi, presensi terkunci dari perubahan biasa. Koreksi dilakukan melalui aksi koreksi yang menyimpan siapa, kapan, dan alasan perubahan pada audit log.

### Halaman presensi

#### A. Daftar pertemuan ekskul
- Filter program, rentang tanggal, dan status presensi.
- Menampilkan tanggal/jam, nama ekskul, pembimbing, jumlah peserta, kelengkapan presensi, dan status Draft/Terkirim.
- Guru hanya melihat sesi dari program yang pembimbingnya ditugaskan kepadanya.
- Opsek dapat melihat semua program dan rekap presensi; akses koreksi mengikuti permission yang ditetapkan.

#### B. Form pertemuan
- Program ekskul, tanggal, waktu mulai/selesai, lokasi, materi/kegiatan, dan catatan.
- Jadwal berulang boleh menjadi dasar pembuatan sesi, tetapi setiap pertemuan tetap memiliki catatan presensi sendiri.
- Pertemuan dapat dibuat oleh pembimbing yang berwenang atau Opsek. Hindari membuat presensi otomatis tanpa sesi nyata.
- Cegah dua sesi yang tidak sengaja sama untuk program dan waktu yang sama; jika sekolah memang mengadakan sesi paralel, dukung dengan sesi terpisah yang eksplisit.

#### C. Daftar anggota dan presensi
- Pencarian nama/NIS dan filter kelas.
- Tombol cepat **Tandai semua hadir** untuk mempercepat pencatatan, tetapi tindakan harus eksplisit dan dapat diperiksa sebelum disimpan.
- Status per siswa: PRESENT, SICK, EXCUSED, ABSENT. Saat sesi dibuat, anggota aktif otomatis berstatus PRESENT sesuai pola presensi KBM; guru mengubah status pengecualian sebelum submit.
- Catatan siswa opsional, misalnya alasan izin atau tindak lanjut.
- Daftar peserta yang ditampilkan adalah anggota aktif pada saat sesi dibuat. Perubahan keanggotaan berikutnya tidak mengubah daftar presensi historis.
- Sediakan indikator belum diisi agar guru tidak keliru mengirim presensi yang belum lengkap.

### Model data presensi yang disarankan

#### ExtracurricularSession
- id, extracurricularId, startsAt, endsAt, location (opsional)
- activityNotes (opsional), status (DRAFT, SUBMITTED, CANCELLED)
- createdByUserId, submittedByUserId (opsional), submittedAt (opsional)
- createdAt, updatedAt
- Program dan tanggal/jam sesi menjadi konteks laporan presensi.

#### ExtracurricularAttendance
- id, sessionId, studentId
- status (PRESENT, SICK, EXCUSED, ABSENT), dengan default PRESENT ketika sesi dibuat
- notes (opsional), markedByUserId, markedAt
- UNIQUE(sessionId, studentId) agar satu siswa hanya memiliki satu catatan per sesi.
- Saat sesi dibuat, sistem membuat satu baris untuk setiap anggota aktif dengan status PRESENT sebagai default. Guru pembimbing mengubah status siswa yang tidak hadir sebelum submit.

#### Koreksi presensi / audit
Koreksi setelah pengiriman mencatat nilai lama, nilai baru, alasan, pelaku, dan waktu. Gunakan audit log aplikasi jika fasilitas audit generik sudah memadai; tidak perlu menggandakan mekanisme audit tanpa alasan.

### Aturan otorisasi dan konsistensi
- Guru hanya dapat membuat sesi dan mencatat/mengubah presensi untuk ekskul yang pembimbingnya ditugaskan kepadanya.
- Opsek dapat mengelola sesi dan membaca seluruh rekap sesuai permission; tindakan koreksi tetap tercatat.
- Backend memvalidasi otorisasi pembimbing pada setiap endpoint, bukan hanya menyembunyikan tombol di UI.
- Siswa yang bukan anggota aktif tidak dapat ditambahkan ke presensi secara sembarang. Jika ada peserta tamu, sediakan alur eksplisit yang mencatat alasan dan tidak otomatis mengubah keanggotaan tetap.
- Setelah sesi dikirim, perubahan status dilakukan melalui koreksi ter-audit, bukan overwrite tanpa jejak.
- Pembatalan sesi menyimpan status dan alasan; jangan menghapus sesi yang sudah memiliki presensi.
- Semua waktu disimpan dengan zona waktu yang konsisten dan ditampilkan dalam zona waktu sekolah.
- Presensi ekskul tidak mengubah presensi KBM, nilai mata pelajaran, atau status kehadiran sekolah secara otomatis.

### Rekap dan laporan
- Rekap per sesi: jumlah hadir, sakit, izin, alpa, dan belum diisi.
- Rekap per siswa dalam satu program: jumlah per status dan persentase hadir dari sesi yang sudah difinalisasi.
- Rekap per program, kelas, pembimbing, dan rentang tanggal untuk Opsek/Kepala Sekolah.
- Sesi Draft atau Cancelled tidak masuk perhitungan kehadiran final. Karena anggota otomatis berstatus PRESENT, UI harus menampilkan pengingat pemeriksaan dan ringkasan status sebelum submit.
- Ekspor CSV/Excel dapat ditambahkan setelah alur inti stabil.

### Tahapan implementasi presensi
1. Tambahkan model sesi, catatan presensi per siswa, migrasi database, permission, dan endpoint backend.
2. Buat halaman guru untuk daftar ekskul bimbingan, membuat sesi, mencatat status anggota, dan mengirim presensi.
3. Buat halaman Opsek untuk memantau kelengkapan, membuka rekap, serta mengelola koreksi yang diizinkan.
4. Tambahkan laporan per siswa/program dan ekspor.
5. Pertimbangkan presensi offline hanya jika kebutuhan operasional sudah jelas; sinkronisasi offline harus menangani konflik dan tidak boleh menimpa koreksi yang lebih baru.


## Status implementasi

Fondasi API dan model Prisma tersedia pada branch fitur: daftar dan pembuatan program, penugasan pembimbing, pengelolaan anggota, pembuatan sesi, perubahan status presensi, dan submit. Halaman dasar Opsek untuk membuat program, menetapkan pembimbing, serta menambahkan anggota dan halaman guru untuk presensi juga tersedia. Pembuatan sesi menggunakan status default PRESENT agar konsisten dengan presensi KBM. Sinkronisasi wajib Pramuka kelas VII, edit/arsip program, audit koreksi pasca-submit, dan laporan telah ditambahkan pada branch fitur. Migrasi di lingkungan target serta pengujian build masih harus divalidasi melalui CI sebelum rilis produksi.
