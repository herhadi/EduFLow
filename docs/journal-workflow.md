# Desain Jurnal Harian dan Jurnal Kelas

Status: **diimplementasikan pada backend dan frontend**; jalankan migration Prisma sebelum fitur digunakan. Build dan alur runtime tetap perlu diverifikasi pada pipeline.

## 1. Terminologi

| Istilah | Definisi |
| --- | --- |
| Jadwal Pelajaran | Pola berulang yang dikonfigurasi operator |
| Agenda Mengajar | Sesi `DailyAgenda` pada tanggal tertentu, hasil generate jadwal efektif |
| Jurnal Harian | Catatan pelaksanaan pembelajaran yang ditulis guru untuk agenda |
| Jurnal Kelas | Rekap agenda, jurnal, status presensi, dan catatan wali kelas untuk satu kelas |

Gunakan **Jurnal Harian** dan **Jurnal Kelas** sebagai istilah UI utama. **Agenda Mengajar** tetap berarti sesi terjadwal. Agenda yang digenerate bukan bukti pembelajaran sudah terlaksana.

## 2. Prinsip Domain

- `Schedule` adalah template; `DailyAgenda` adalah sesi terjadwal pada tanggal tertentu.
- `TeachingJournal` mencatat pembelajaran dan terhubung ke satu `DailyAgenda`.
- `Attendance` dan `AttendanceItem` tetap khusus untuk presensi.
- `ClassJournalNote` menyimpan catatan tambahan wali kelas, terpisah dari jurnal guru mapel.
- Jurnal Kelas adalah ringkasan terhitung, bukan form yang harus diisi ulang.
- Perubahan penting harus diaudit dengan actor dan waktu; koreksi menyimpan nilai sebelum/sesudah bila relevan.

## 3. Model Data Konseptual

### TeachingJournal

Satu agenda mempunyai nol atau satu jurnal; `agendaId` harus unik. `teacherId` adalah penulis jurnal. Jika ada guru pengganti, kewenangan ditentukan oleh penugasan efektif pada agenda.

| Field | Aturan |
| --- | --- |
| `agendaId` | Wajib, unik, FK ke `DailyAgenda` |
| `teacherId` | Wajib, penulis jurnal |
| `learningObjectives` | Opsional |
| `material` | Wajib sebelum submit |
| `learningActivities` | Opsional |
| `learningOutcome` | Opsional |
| `reflection` | Opsional |
| `issueNotes` | Opsional |
| `status` | `DRAFT`, `SUBMITTED`, `LOCKED` |
| `submittedAt`, `lockedAt` | Timestamp lifecycle |
| `createdAt`, `updatedAt` | Timestamp standar |

Model `TeachingJournal` telah ditambahkan ke schema Prisma dan migration. Tidak perlu approval kepala sekolah untuk setiap jurnal secara default. Jika nanti dibutuhkan review, rancang workflow terpisah dari approval presensi.

### ClassJournalNote

Catatan wali kelas per `classId` dan tanggal. Field konseptual: `classId`, `date`, `authorTeacherId`, `content`, timestamp. Banyak catatan pada kelas/tanggal sama diperbolehkan. Penulis hanya dapat mengubah catatan sesuai aturan edit; setiap perubahan diaudit. Jangan menyalin materi guru ke tabel ini.

## 4. Status Jurnal

- `DRAFT`: penulis yang berwenang dapat mengedit.
- `SUBMITTED`: sudah dikirim; perubahan normal ditutup, koreksi melalui jalur eksplisit yang diaudit.
- `LOCKED`: dikunci untuk periode yang ditetapkan dan tidak bisa diedit melalui jalur biasa.

Transisi normal: `DRAFT -> SUBMITTED -> LOCKED`. Submit memvalidasi agenda, penugasan guru, tanggal, dan materi. Perubahan status jurnal tidak otomatis mengubah Attendance. Agenda tanpa jurnal tetap tampil **Belum diisi**; jurnal terkirim tidak otomatis membuktikan seluruh syarat agenda selesai.

## 5. Ringkasan Jurnal Kelas

Tampilkan total agenda, jurnal terkirim, jurnal belum diisi/draft, agenda batal/kelas kosong secara terpisah, mata pelajaran, guru, waktu, materi, status presensi sesuai permission, dan catatan wali kelas. Jangan hitung “KBM terlaksana” hanya dari jumlah agenda; indikator itu harus didefinisikan dari status agenda dan workflow terkait. Rekap mingguan/bulanan dihitung dari sumber data yang sama; hindari tabel agregat sebelum terbukti diperlukan.

## 6. Akses

- Guru mengelola jurnal hanya untuk agenda yang ditugaskan, termasuk guru pengganti yang sah.
- Wali kelas membaca seluruh jurnal kelas binaan dan membuat catatan kelas.
- Operator dan kepala sekolah membaca rekap lintas kelas sesuai permission.
- Kepala sekolah tidak mengedit jurnal guru secara langsung.
- Orang tua tidak mendapat akses ke jurnal internal kelas pada fase awal.
- Scope divalidasi backend, bukan hanya dengan menyembunyikan UI.

Nama permission usulan tercantum pada `docs/permission-matrix.md` dan harus dicocokkan dengan katalog aktual sebelum implementasi.

## 7. API Rancangan

- `GET /api/teaching-journals/mine?date=YYYY-MM-DD`
- `GET /api/teaching-journals/:agendaId`
- `PUT /api/teaching-journals/:agendaId`
- `POST /api/teaching-journals/:agendaId/submit`
- `GET /api/class-journals/:classId?date=YYYY-MM-DD`
- `GET /api/class-journals/:classId?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/class-journals/:classId/notes`
- `PATCH /api/class-journals/:classId/notes/:noteId`

Endpoint di atas telah ditambahkan dengan response envelope, pembatasan permission/scope di backend, serta audit perubahan jurnal dan catatan. Pengujian otomatis/runtime masih perlu dilengkapi.

## 8. Uji Penerimaan Minimum

1. Agenda tanpa jurnal tampil sebagai belum diisi.
2. Guru tidak dapat membaca/mengubah jurnal agenda guru lain.
3. Guru pengganti yang sah dapat mengisi agenda yang ditugaskan kepadanya.
4. Satu agenda tidak dapat memiliki dua jurnal.
5. Jurnal tidak dapat dikirim tanpa materi.
6. Submit jurnal tidak mengubah state presensi secara otomatis.
7. Wali kelas hanya melihat kelas binaannya dan dapat menambah catatan kelas.
8. Catatan wali kelas tidak dapat mengubah jurnal guru.
9. Operator/kepala sekolah membaca rekap sesuai scope.
10. Rekap tanggal dan rentang memisahkan agenda, jurnal, dan presensi.
11. Perubahan/koreksi jurnal menghasilkan audit.
12. Agenda terjadwal saja tidak dihitung sebagai KBM terlaksana.
