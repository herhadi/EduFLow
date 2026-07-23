# Perencanaan Akademik

Dokumen ini memisahkan tanggung jawab admin dan guru dalam pengelolaan jadwal, kalender pendidikan, perangkat ajar, dan nilai siswa.

## Pembagian Actor

| Actor | Tanggung Jawab |
| --- | --- |
| `root` | Support teknis sistem: health check, queue, backup/recovery, Telegram webhook, audit, user, role, dan permission |
| `operator_sekolah` | Mengelola kalender pendidikan, jadwal sekolah, tahun ajaran, semester, kelas, mapel, dan konfigurasi akademik |
| `tu` | Membantu administrasi data sekolah, import data, arsip, dan kebutuhan tata usaha yang tidak selalu bersifat akademik |
| `guru` | Mengelola perangkat ajar, bahan ajar, buku KBM, dan nilai siswa sesuai kelas/mapel yang diampu |
| `wali_kelas` | Memantau kelas binaan, presensi, ringkasan siswa, dan tindak lanjut kelas |
| `kepala_sekolah` | Monitoring perangkat ajar, memberi approval nilai semester, melihat laporan, dan evaluasi performa guru |

## Area Administrasi Frontend

- `/admin/guru`: menghubungkan `Teacher` dengan `User`, mengatur role, mapel ampu, dan wali kelas.
- `/admin/akademik`: mengelola kelas dan mata pelajaran secara fleksibel.
- `/admin/akses`: mengelola user dan hak akses.
- `/admin/schedules`: menyusun jadwal berdasarkan kelas, mapel, dan guru yang sudah dikonfigurasi.

## Hak Operator Sekolah

Operator sekolah mengelola data yang bersifat konfigurasi akademik sekolah:

- kalender pendidikan,
- tahun ajaran,
- semester,
- kelas,
- mata pelajaran,
- guru,
- siswa,
- jadwal tetap,
- generate agenda harian.

Kaldik (kalender pendidikan) dipakai untuk menentukan hari efektif, libur, ujian, kegiatan sekolah, dan pengecualian jadwal. Event Kaldik yang memiliki `blocksAgenda` menjadi sumber tunggal untuk melewati pembuatan `DailyAgenda`.

Di backend, alur akademik dibagi ke service kecil agar aturan setiap area tidak bercampur: `AcademicMasterService` untuk master sekolah, `AcademicCalendarService` untuk Kaldik, `AcademicScheduleService` untuk jadwal/revisi, `AgendaGenerationService` untuk generate agenda, `AgendaManagementService` untuk agenda harian/guru pengganti, `TeacherAcademicService` untuk administrasi guru, `TeacherPortalService` untuk endpoint personal guru/wali kelas, dan `StudentAcademicService` untuk daftar siswa akademik.

Admin teknis tidak sama dengan TU. Dalam EduFlow, `root` dipakai untuk support teknis dan recovery, sedangkan pekerjaan operasional akademik harian sekolah memakai `operator_sekolah` dan `tu`.

Dalam navigasi frontend, `operator_sekolah` diperlakukan sebagai admin operasional sekolah. Menu personal seperti profil, ganti password, dan session management tetap dipisahkan di menu `Profil`.

Menu teknis seperti health check, queue monitoring, worker status, dan failed jobs berada di area `Ops` dan hanya ditampilkan untuk `root`.
Menu user dan hak akses berada di `/system/access` dan hanya ditampilkan serta dapat dibuka oleh `root`. Jika user non-root membuka URL tersebut secara manual, frontend menampilkan peringatan akses ditolak lalu mengarahkan user ke dashboard sesuai role. Operator sekolah tidak mengelola user global atau permission teknis dari navigasi harian.

## Tahun Ajaran

Tahun ajaran dikelola dari `/admin/akademik` oleh pengguna dengan permission `academic.manage`. Operator memasukkan format `YYYY/YYYY`, misalnya `2025/2026`; nilai harus berurutan. Sistem menyimpan periode akademik otomatis dari 1 Juli pada tahun pertama hingga 30 Juni pada tahun kedua.

Pembuatan memakai `POST /api/academic/school-years`, menyimpan data pada `SchoolYear`, membuat semester `Ganjil` (1 Juli-31 Desember) serta `Genap` (1 Januari-30 Juni), dan mencatat audit action `school-year.created`. Tahun ajaran yang berhasil dibuat langsung tersedia sebagai pilihan saat membuat rombongan belajar.

Jadwal adalah baseline satu tahun ajaran, meskipun record baseline menyimpan `semesterId` sebagai konteks awal pembuatan. Perubahan tidak menyalin jadwal; sistem menyimpan `ScheduleRevision` dengan tanggal mulai berlaku dan alasan perubahan. Filter jadwal harus berbasis tanggal efektif, bukan hanya `semesterId`, sehingga baseline tetap terlihat di Ganjil dan Genap, sementara revisi tengah semester tidak muncul ketika operator melihat kondisi sebelum tanggal revisi. Agenda harian menyimpan snapshot efektif pada tanggal agenda dibuat.

`ScheduleRevision` dapat mengubah kelas, mapel, guru, hari, jam, ruang, dan semester. Tampilan jadwal per kelas harus menerapkan revisi lebih dulu, lalu memfilter kelas, agar jadwal yang dipindahkan tampil pada kelas tujuan. Jadwal pribadi guru juga harus membaca baseline dan revisi, sehingga guru pengganti dapat melihat jadwal yang mulai berlaku untuknya. Pembatalan revisi dilakukan dengan menghapus record revisi dan mencatat audit.

Validasi konflik revisi wajib menghitung kondisi efektif semua jadwal pada tanggal revisi. Konflik guru atau kelas tidak boleh dicek hanya terhadap baseline `Schedule`, karena revisi lain yang sudah berlaku dapat memindahkan guru, kelas, atau jam.

Form rombongan belajar menampilkan label untuk Tahun Ajaran Baru, Tahun Ajaran, Tingkat, dan Rombel agar konteks setiap nilai jelas.

## Hak Guru

Guru tidak mengelola kalender pendidikan dan jadwal sekolah secara umum. Guru mengelola pekerjaan akademik untuk mapel dan kelas yang diampu:

- Program Tahunan,
- Program Semester,
- KKTP,
- Perencanaan Pembelajaran,
- data buku yang digunakan untuk KBM,
- nilai siswa.

Dalam navigasi frontend, guru diarahkan ke `Hari Ini`, `Jadwal Saya`, `Presensi`, `Notif`, dan `Profil`. Guru tidak melihat menu `Admin`, `Setup`, atau `Ops`.

Navigasi Kepala Sekolah berisi `Ringkasan`, `Review`, `Guru`, `Notif`, dan `Profil`. Menu `Review` menjadi pusat persetujuan perangkat ajar, penilaian semester, dan tindak lanjut operasional guru. Laporan sekolah tersedia sebagai submenu pada area Kepala Sekolah.

Notifikasi Kepala Sekolah menggunakan inbox personal. Isinya dibatasi pada perangkat ajar dan nilai yang menunggu persetujuan, kelas kosong, guru belum submit, koreksi presensi penting, penugasan guru pengganti, ringkasan operasional, dan pengumuman akademik. Kepala Sekolah tidak melihat payload queue, status provider, failed job, atau tombol retry.

Halaman `/dashboard` juga wajib role-aware. Untuk guru, halaman tersebut menjadi beranda personal berisi agenda hari ini, jadwal saya, presensi, perangkat ajar, penilaian, notifikasi, dan kelas binaan jika memiliki role wali kelas. Dashboard monitoring global hanya ditampilkan kepada actor yang memiliki tanggung jawab monitoring sekolah.

## Notifikasi Guru

Notifikasi guru adalah inbox personal, bukan Notification Center operasional. Isinya:

- reminder sebelum kelas dimulai,
- pengingat presensi belum disubmit,
- permintaan koreksi presensi,
- perangkat ajar diminta revisi atau telah disetujui,
- nilai semester diminta revisi atau telah disetujui,
- pengumuman akademik yang memang ditujukan kepada guru.

Guru tidak melihat:

- log pengiriman notifikasi seluruh sekolah,
- nomor penerima wali murid lain,
- status provider WhatsApp/Telegram global,
- failed jobs,
- tombol retry queue,
- pengelolaan template notifikasi.

Endpoint inbox personal guru adalah `GET /api/notifications/mine`. Notification Center global tetap membutuhkan permission `notification.read` atau `notification.manage`.

## Akses Inbox Berdasarkan Role

`guru`, `wali_kelas`, `kepala_sekolah`, dan `orang_tua` menggunakan inbox personal melalui `GET /api/notifications/mine`. Inbox Orang Tua hanya memuat ringkasan presensi dan pengumuman akademik yang dialamatkan ke kontak wali dengan email sama seperti akun login.

`root` dan `operator_sekolah` mengelola Notification Center operasional termasuk retry. `tu` dan `bk` dapat membaca status pengiriman, tetapi tidak dapat melakukan retry. Akses ini dikendalikan oleh permission, bukan tampilan frontend saja.

Perangkat ajar sebaiknya tidak hanya berupa upload dokumen mentah. Sistem perlu menyimpan status review, catatan revisi, dan approval supaya kepala sekolah bisa memonitor kelengkapan dan kualitas administrasi guru.

## Supervisi Perangkat Ajar

Guru mengunggah atau mengisi dokumen perangkat ajar. Kepala sekolah memonitor dan memberi catatan.

```text
Guru upload perangkat ajar
  -> state DRAFT
  -> guru submit
  -> state SUBMITTED
  -> kepala sekolah review
  -> APPROVED atau REVISION_REQUESTED
  -> jika revisi, guru perbaiki dan submit ulang
```

State awal yang disarankan:

| State | Makna |
| --- | --- |
| `DRAFT` | Masih disusun guru |
| `SUBMITTED` | Sudah dikirim untuk review |
| `REVISION_REQUESTED` | KS meminta perbaikan |
| `APPROVED` | Sudah disetujui KS |
| `ARCHIVED` | Diarsipkan setelah periode selesai |

Dashboard kepala sekolah sebaiknya menampilkan:

- total guru,
- guru sudah submit Program Tahunan,
- guru sudah submit Program Semester,
- KKTP lengkap/belum lengkap,
- Perencanaan Pembelajaran lengkap/belum lengkap,
- buku KBM lengkap/belum lengkap,
- dokumen menunggu review,
- dokumen perlu revisi,
- dokumen sudah approved.

## Approval Nilai Semester

Nilai semester perlu workflow approval karena setara dengan rapor fisik yang ditandatangani kepala sekolah.

```text
Guru input nilai
  -> DRAFT
  -> guru submit nilai semester
  -> SUBMITTED
  -> wali kelas/operator cek kelengkapan jika diperlukan
  -> kepala sekolah approve
  -> APPROVED
  -> nilai dikunci untuk rapor
```

State nilai yang disarankan:

| State | Makna |
| --- | --- |
| `DRAFT` | Nilai masih bisa diubah guru |
| `SUBMITTED` | Nilai dikirim untuk validasi |
| `REVISION_REQUESTED` | Nilai perlu diperbaiki |
| `APPROVED` | Nilai disetujui KS |
| `LOCKED` | Nilai final untuk rapor dan tidak bisa diubah normal |

Koreksi nilai setelah `LOCKED` harus memakai permission khusus dan wajib masuk audit.

## Domain Yang Perlu Disiapkan

```text
academic-planning/
  annual-programs/
  semester-programs/
  kktp/
  lesson-plans/
  teaching-books/
  student-grades/
  approvals/
  attachments/
```

Domain ini masih bagian dari academic, tetapi sebaiknya dipisah sebagai subdomain supaya tidak bercampur dengan schedule dan attendance.

## Entity Awal Yang Disarankan

| Entity | Fungsi |
| --- | --- |
| `AcademicCalendarEvent` | Hari libur, ujian, kegiatan, atau pengecualian KBM |
| `AnnualProgram` | Program Tahunan guru per tahun ajaran dan mapel |
| `SemesterProgram` | Program Semester guru per semester dan mapel |
| `Kktp` | Kriteria Ketercapaian Tujuan Pembelajaran |
| `LessonPlan` | Perencanaan pembelajaran guru |
| `TeachingBook` | Buku atau referensi yang digunakan untuk KBM |
| `Assessment` | Komponen nilai harian/formatif guru per kelas, mapel, semester, dan tanggal |
| `AssessmentScore` | Skor siswa per `StudentEnrollment` untuk setiap komponen nilai |
| `AcademicPlanningAttachment` | File dokumen perangkat ajar yang diunggah guru |
| `AcademicPlanningReview` | Catatan review, approval, dan revisi perangkat ajar |
| `GradeApproval` | Approval nilai semester oleh kepala sekolah |

## Prinsip Relasi

- Kaldik disimpan sebagai `AcademicCalendarEvent` yang terikat ke `SchoolYear`; model tahun ajaran menjadi master kalender agar tidak ada container data yang redundan.
- Event kalender dapat terikat ke `Semester` jika spesifik semester.
- Perangkat ajar guru terikat ke `Teacher`, `Subject`, `SchoolYear`, dan bila perlu `Semester`.
- Nilai siswa wajib terikat ke `StudentEnrollment`, bukan hanya `Student`, supaya histori kelas dan tahun ajaran aman.
- Guru hanya boleh mengelola perangkat ajar dan nilai untuk kelas/mapel yang ditugaskan.
- Riwayat penugasan guru disimpan per `SchoolYear`, mencakup status aktif, cuti, pindah, pensiun, atau tidak aktif beserta mapel ampu dan catatan. Jadwal tahun ajaran yang memiliki penugasan tersebut hanya boleh memakai guru aktif dengan mapel yang tercatat pada tahun ajaran itu.
- Wali kelas harus tetap memiliki mapel ampu; wali kelas adalah tugas tambahan pada kelas, bukan jenis guru terpisah.
- Dokumen perangkat ajar wajib menyimpan `status`, `submittedAt`, `reviewedAt`, `reviewedById`, `reviewNote`, serta penanda revisi sederhana seperti `reviewSection` dan `reviewPriority`.
- Nilai harian memakai `Assessment` dan `AssessmentScore`; guru dapat menyimpan draft skor lalu submit. Nilai yang sudah submit dibaca oleh Report Siswa sebagai rata-rata, nilai terbaru, dan riwayat penilaian.
- Nilai semester wajib menyimpan `approvedAt`, `approvedById`, dan `lockedAt` setelah disetujui.

## Workflow Umum

```text
Operator sekolah membuat kalender pendidikan
  -> Operator sekolah membuat jadwal tetap
  -> Sistem generate DailyAgenda sesuai hari efektif
  -> Guru menyiapkan perangkat ajar
  -> Kepala sekolah review perangkat ajar
  -> Guru mengajar dan presensi
  -> Guru menginput nilai siswa
  -> Kepala sekolah approve nilai semester
  -> Rapor siap diterbitkan
```

## Kontrol KBM Harian

Agenda harian menjadi pusat realisasi jadwal. Setelah jadwal dibuat, operator wajib memastikan agenda untuk rentang tanggal berjalan sudah tersedia. Halaman jadwal menyediakan cek coverage agenda untuk membandingkan jadwal efektif dengan `DailyAgenda` yang sudah dibuat, sehingga operator mendapat peringatan bila masih ada sesi yang belum digenerate.

Presensi guru dilengkapi checklist KBM harian:

- guru hadir,
- presensi siswa selesai,
- materi atau catatan KBM terisi,
- foto kelas tersedia,
- catatan kendala bila ada.

Checklist disimpan pada `Attendance` agar laporan KBM tidak hanya berisi status hadir siswa, tetapi juga kondisi operasional kelas.

Jika guru utama berhalangan, operator dapat menetapkan guru pengganti pada `DailyAgenda`. Guru pengganti dapat membuka dan submit presensi agenda tersebut tanpa mengubah baseline jadwal tahunan. Data agenda tetap menyimpan guru utama dan guru pengganti agar laporan dapat membedakan tanggung jawab jadwal dan realisasi pengganti.

Dashboard operasional menampilkan ringkasan Kendali KBM harian dari `DailyAgenda` dan `Attendance`: checklist yang sudah lengkap, catatan kendala, kelas yang perlu tindak lanjut, serta daftar guru pengganti. Ringkasan ini dipakai operator dan monitoring sekolah agar masalah KBM hari itu terlihat tanpa membuka tiap agenda satu per satu.

## Report Siswa

Report siswa membaca `AttendanceItem` sebagai sumber presensi per siswa, mapel, guru, dan tanggal. Halaman laporan Kepala Sekolah menampilkan filter kelas, rentang tanggal, status presensi, ringkasan hadir/sakit/izin/alpha, indikator risiko, serta detail presensi terbaru per siswa.

Nilai harian membaca `AssessmentScore` yang sudah disubmit. Detail report siswa menampilkan rata-rata nilai, nilai terbaru, dan riwayat singkat penilaian per mapel. Approval nilai semester tetap menjadi tahap lanjutan setelah input nilai harian stabil.

### Export Excel Nilai Harian

Export nilai harian tersedia untuk guru melalui `/teacher/assessments` dan endpoint `GET /api/student-grades/assessments/export`. Export mendukung report bulanan dan semesteran tanpa membuat file terlalu lebar atau sulit dibaca. Filter utama:

- tahun ajaran,
- semester,
- kelas,
- mata pelajaran,
- periode tanggal untuk bulanan,
- status submit nilai yang terlihat pada sheet komponen.

Struktur workbook:

| Sheet | Isi | Tujuan |
| --- | --- | --- |
| `Rekap` | Satu baris per siswa: No, NIS, NISN, Nama Siswa, Kelas, Mapel, Periode, kolom nilai ringkas `UH 1`, `UH 2`, dan seterusnya, Rata-rata, Komponen Terisi, Belum Terisi, Status | Dibaca cepat oleh guru, KS, atau operator |
| `Komponen` | Kode komponen, judul, jenis, tanggal, skor maksimal, bobot, guru, status submit | Menjelaskan arti kolom `UH 1`, `UH 2`, dan seterusnya tanpa memenuhi sheet utama |
| `Catatan` | Hanya siswa/komponen yang memiliki catatan, nilai kosong, remedial, atau anomali | Menjaga sheet utama tetap efisien tetapi informasi tindak lanjut tetap ada |

Untuk export bulanan, kolom nilai hanya mengambil komponen yang tanggalnya berada dalam rentang bulan terpilih. Untuk export semesteran, kolom nilai mengambil semua komponen pada `semesterId` terpilih. Export guru mengambil nilai milik guru login pada kelas/mapel yang dipilih, termasuk draft/revisi agar guru bisa melakukan pengecekan internal; status setiap komponen tetap ditampilkan agar report resmi dapat membedakan nilai yang sudah submit dan belum.

## Catatan Implementasi

## Implementasi Perangkat Ajar Tahap Awal

Domain `academic-planning` sudah menyediakan workflow awal:

- `GET /api/academic-planning/mine` untuk daftar perangkat ajar guru login.
- `POST /api/academic-planning` untuk menyimpan draft.
- `POST /api/academic-planning/:id/submit` untuk mengirim pengajuan kepada Kepala Sekolah.
- `GET /api/academic-planning/review-queue` untuk antrean review Kepala Sekolah.
- `PATCH /api/academic-planning/:id/review` untuk approve atau meminta revisi.

Halaman guru berada di `/teacher/teaching-plans`. Lampiran DOCX/PDF maupun foto Buku KBM disimpan pada bucket privat Cloudflare R2 melalui `StorageProvider` di infrastructure layer. Domain menyimpan object key, nama asli, MIME type, ukuran, dan waktu upload; URL preview dibuat sementara saat pengguna berhak membuka lampiran.

Konfigurasi backend yang wajib tersedia:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_DOWNLOAD_URL_EXPIRES_IN` (default 900 detik)

File dibatasi maksimal 10 MB. Untuk `Program Tahunan`, `Program Semester`, `KKTP`, dan `Perencanaan Pembelajaran`, lampiran wajib berformat DOCX atau PDF. Untuk `Buku KBM`, form menyediakan aksi `Buka Kamera` dan `Pilih Galeri` untuk foto JPEG, PNG, atau WebP; aksi kamera meminta kamera belakang pada perangkat yang mendukungnya. Lampiran wajib tersedia sebelum pengajuan dapat dikirim kepada Kepala Sekolah. Guru hanya dapat mengganti lampiran ketika status masih `DRAFT` atau `REVISION_REQUESTED`.

Kepala Sekolah membuka `/principal/review` untuk melihat antrean `SUBMITTED`, membuka dokumen melalui signed URL R2, menyetujui perangkat ajar, atau meminta revisi dengan catatan wajib. Saat meminta revisi, KS dapat mengisi bagian/halaman yang perlu diperbaiki dan memilih prioritas `Tinggi`, `Sedang`, atau `Rendah`.

Saat guru submit, sistem membuat notifikasi `IN_APP` untuk setiap akun Kepala Sekolah. Badge navigasi menghitung notifikasi dengan `readAt = null`; klik inbox menandai notifikasi dibaca dan membuka `/principal/review`.

Hasil review membuat notifikasi inbox untuk guru. Status `REVISION_REQUESTED` menggunakan indikator kuning dan status `APPROVED` menggunakan indikator hijau. Pada status revisi, guru melihat catatan KS, bagian/halaman yang ditandai bila ada, dan prioritas revisi. Keputusan KS menandai notifikasi pengajuan terkait sebagai sudah dibaca sehingga badge langsung berkurang.

Badge pada daftar perangkat ajar juga menggunakan kuning untuk revisi dan hijau untuk disetujui. Pembukaan PDF memakai signed URL R2 `inline` sehingga browser dapat menampilkan preview langsung. Pembukaan DOCX memakai helper frontend bersama yang diarahkan ke Microsoft Office Online Viewer; jika viewer eksternal tidak dapat membaca signed URL yang sedang berlaku, user masih dapat membuka/unduh dari URL lampiran sementara sesuai perilaku browser.

Pilihan mata pelajaran pada halaman tersebut dibaca dari `GET /api/academic/me/subjects`, sehingga guru hanya dapat membuat perangkat ajar untuk mata pelajaran yang sudah ditugaskan kepadanya melalui `TeacherSubject`.

- Jangan gabungkan `LessonPlan` dengan `DailyAgenda`; lesson plan adalah rencana, agenda adalah realisasi harian.
- Jangan simpan nilai siswa langsung di `Student`; gunakan `StudentGrade` dengan `StudentEnrollment`.
- Kaldik harus memengaruhi generate agenda agar agenda tidak dibuat pada hari libur atau kegiatan non-KBM yang memblokir agenda.
- File upload dokumen sebaiknya masuk storage provider melalui infrastructure layer, sedangkan metadata dan workflow approval tetap di PostgreSQL.
- Kepala sekolah tidak perlu mengedit isi dokumen/nilai secara langsung; KS memberi approval, reject/revisi, dan catatan.
