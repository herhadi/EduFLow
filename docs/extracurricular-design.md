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
