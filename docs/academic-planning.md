# Perencanaan Akademik

Dokumen ini memisahkan tanggung jawab admin dan guru dalam pengelolaan jadwal, kalender pendidikan, perangkat ajar, dan nilai siswa.

## Pembagian Actor

| Actor | Tanggung Jawab |
| --- | --- |
| `root` | Akses teknis semua fitur, dipakai sangat terbatas untuk owner/dev/super admin teknis |
| `operator_sekolah` | Mengelola kalender pendidikan, jadwal sekolah, tahun ajaran, semester, kelas, mapel, dan konfigurasi akademik |
| `tu` | Membantu administrasi data sekolah, import data, arsip, dan kebutuhan tata usaha yang tidak selalu bersifat akademik |
| `guru` | Mengelola perangkat ajar, bahan ajar, buku KBM, dan nilai siswa sesuai kelas/mapel yang diampu |
| `wali_kelas` | Memantau kelas binaan, presensi, ringkasan siswa, dan tindak lanjut kelas |
| `kepala_sekolah` | Monitoring perangkat ajar, memberi approval nilai semester, melihat laporan, dan evaluasi performa guru |

## Area Administrasi Frontend

- `/admin/guru`: menghubungkan `Teacher` dengan `User`, mengatur role, mapel ampu, dan wali kelas.
- `/admin/akademik`: mengelola kelas dan mata pelajaran secara fleksibel.
- `/admin/akses`: mengelola user dan hak akses.
- `/schedules`: menyusun jadwal berdasarkan kelas, mapel, dan guru yang sudah dikonfigurasi.

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

Kalender pendidikan dipakai untuk menentukan hari efektif, libur, ujian, kegiatan sekolah, dan pengecualian jadwal.

Admin teknis tidak sama dengan TU. Dalam EduFlow, `root` atau admin teknis dipakai untuk akses penuh dan recovery, sedangkan pekerjaan operasional harian sekolah memakai `operator_sekolah` dan `tu`.

## Hak Guru

Guru tidak mengelola kalender pendidikan dan jadwal sekolah secara umum. Guru mengelola pekerjaan akademik untuk mapel dan kelas yang diampu:

- Program Tahunan,
- Program Semester,
- KKTP,
- Perencanaan Pembelajaran,
- data buku yang digunakan untuk KBM,
- nilai siswa.

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
| `AcademicCalendar` | Kalender pendidikan sekolah |
| `AcademicCalendarEvent` | Hari libur, ujian, kegiatan, atau pengecualian KBM |
| `AnnualProgram` | Program Tahunan guru per tahun ajaran dan mapel |
| `SemesterProgram` | Program Semester guru per semester dan mapel |
| `Kktp` | Kriteria Ketercapaian Tujuan Pembelajaran |
| `LessonPlan` | Perencanaan pembelajaran guru |
| `TeachingBook` | Buku atau referensi yang digunakan untuk KBM |
| `StudentGrade` | Nilai siswa per mapel, kelas, semester, dan komponen penilaian |
| `AcademicPlanningAttachment` | File dokumen perangkat ajar yang diunggah guru |
| `AcademicPlanningReview` | Catatan review, approval, dan revisi perangkat ajar |
| `GradeApproval` | Approval nilai semester oleh kepala sekolah |

## Prinsip Relasi

- Kalender pendidikan terikat ke `SchoolYear`.
- Event kalender dapat terikat ke `Semester` jika spesifik semester.
- Perangkat ajar guru terikat ke `Teacher`, `Subject`, `SchoolYear`, dan bila perlu `Semester`.
- Nilai siswa wajib terikat ke `StudentEnrollment`, bukan hanya `Student`, supaya histori kelas dan tahun ajaran aman.
- Guru hanya boleh mengelola perangkat ajar dan nilai untuk kelas/mapel yang ditugaskan.
- Wali kelas harus tetap memiliki mapel ampu; wali kelas adalah tugas tambahan pada kelas, bukan jenis guru terpisah.
- Dokumen perangkat ajar wajib menyimpan `status`, `submittedAt`, `reviewedAt`, `reviewedById`, dan `reviewNote`.
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

## Catatan Implementasi

- Jangan gabungkan `LessonPlan` dengan `DailyAgenda`; lesson plan adalah rencana, agenda adalah realisasi harian.
- Jangan simpan nilai siswa langsung di `Student`; gunakan `StudentGrade` dengan `StudentEnrollment`.
- Kalender pendidikan harus memengaruhi generate agenda agar agenda tidak dibuat pada hari libur atau kegiatan non-KBM.
- File upload dokumen sebaiknya masuk storage provider melalui infrastructure layer, sedangkan metadata dan workflow approval tetap di PostgreSQL.
- Kepala sekolah tidak perlu mengedit isi dokumen/nilai secara langsung; KS memberi approval, reject/revisi, dan catatan.
