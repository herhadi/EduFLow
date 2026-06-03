# Database Design: Core Academic Entity

Fokus awal database EduFlow adalah relasi akademik yang benar. Jangan menambah banyak tabel sebelum flow inti stabil.

## Urutan Entity Inti

```text
SchoolYear
Semester
Class
Subject
Teacher
Student
Guardian
StudentGuardian
StudentEnrollment
Schedule
DailyAgenda
Attendance
AttendanceItem
```

## Prinsip Utama

- PostgreSQL adalah sumber data permanen.
- Redis bukan database utama.
- Semua entity utama memakai UUID.
- Entity penting memakai soft delete.
- Data akademik wajib terkait tahun ajaran dan semester.
- Presensi tidak boleh langsung mengacu pada jadwal tetap.
- Perubahan penting wajib dicatat ke `AuditLog`.

## Relasi Inti

```text
SchoolYear
  1 -> n Semester
  1 -> n Class
  1 -> n Schedule
  1 -> n DailyAgenda

Semester
  1 -> n Schedule
  1 -> n DailyAgenda

Class
  1 -> n StudentEnrollment
  1 -> n Schedule
  1 -> n DailyAgenda
  1 -> n Attendance

Student
  1 -> n StudentEnrollment
  1 -> n StudentGuardian
  1 -> n AttendanceItem

Guardian
  1 -> n StudentGuardian

StudentGuardian
  n -> 1 Student
  n -> 1 Guardian

StudentEnrollment
  n -> 1 Student
  n -> 1 Class
  n -> 1 SchoolYear

Subject
  1 -> n Schedule
  1 -> n DailyAgenda

Teacher
  1 -> n Schedule
  1 -> n DailyAgenda

Schedule
  1 -> n DailyAgenda

DailyAgenda
  1 -> 0..1 Attendance

Attendance
  1 -> n AttendanceItem

```

## Makna Entity

| Entity | Fungsi | Relasi Penting |
| --- | --- | --- |
| `SchoolYear` | Tahun ajaran, contoh `2026/2027` | Memiliki semester, kelas, jadwal, agenda |
| `Semester` | Periode akademik dalam tahun ajaran | Terikat ke `SchoolYear` |
| `Class` | Rombel atau kelas akademik | Terikat ke `SchoolYear`, berisi siswa |
| `Subject` | Mata pelajaran | Dipakai jadwal dan agenda |
| `Teacher` | Guru pengajar | Dipakai jadwal dan agenda |
| `Student` | Data identitas siswa | Tidak menyimpan `classId` langsung |
| `Guardian` | Data wali murid atau orang tua | Bisa terkait ke banyak siswa |
| `StudentGuardian` | Relasi siswa dan wali murid | Menyimpan hubungan dan kontak utama |
| `StudentEnrollment` | Riwayat siswa dalam kelas pada tahun ajaran | Terikat ke `Student`, `Class`, dan `SchoolYear` |
| `Schedule` | Template jadwal tetap | Sumber generate agenda harian |
| `DailyAgenda` | Realisasi jadwal pada tanggal tertentu | Pusat aktivitas KBM harian |
| `Attendance` | Sesi presensi untuk satu agenda | Menyimpan workflow state presensi |
| `AttendanceItem` | Presensi satu siswa | Unik per attendance dan siswa |

## Flow Relasi Wajib

```text
Schedule
  -> DailyAgenda
  -> Attendance
  -> AttendanceItem
```

`Schedule` adalah template. `DailyAgenda` adalah kejadian harian. `Attendance` adalah sesi presensi pada agenda. `AttendanceItem` adalah status presensi setiap siswa.

## Kenapa Attendance Dipisah Dari AttendanceItem

`Attendance` menyimpan informasi level sesi:

- agenda mana yang dipresensi,
- kelas mana,
- state workflow presensi,
- waktu mulai,
- waktu submit,
- waktu approval,
- waktu koreksi,
- waktu lock,
- waktu selesai,
- catatan umum guru.

`AttendanceItem` menyimpan informasi level siswa:

- siswa,
- status hadir,
- catatan per siswa.

Pemisahan ini membuat rekap, audit, koreksi, dan reporting lebih bersih.

## Constraint Dan Index Penting

- `SchoolYear.name` unik.
- `Semester` unik berdasarkan `schoolYearId` dan `type`.
- `Class` unik berdasarkan `schoolYearId` dan `name`.
- `StudentGuardian` unik berdasarkan `studentId` dan `guardianId`.
- `StudentEnrollment` unik berdasarkan `studentId` dan `schoolYearId`.
- `DailyAgenda` unik berdasarkan `scheduleId` dan `date`.
- `Attendance.agendaId` unik agar satu agenda hanya punya satu sesi presensi.
- `Attendance.state` di-index untuk approval, summary, dan koreksi.
- `AttendanceItem` unik berdasarkan `attendanceId` dan `studentId`.
- `DailyAgenda` di-index berdasarkan tanggal, status, kelas, guru, tahun ajaran, dan semester.
- `Schedule` di-index berdasarkan kelas dan guru per hari.

## Catatan Relasi Yang Sengaja Dibuat Sederhana

- `Student` tidak menyimpan `classId` agar aman untuk naik kelas, pindah kelas, dan histori akademik.
- Riwayat kelas siswa disimpan di `StudentEnrollment`.
- Guru pengganti belum dibuat sebagai tabel terpisah.
- Multi sekolah belum dibuat.

Tambahan tersebut dilakukan setelah workflow jadwal, agenda, dan presensi stabil.

## Audit Wajib

Audit wajib untuk:

- perubahan jadwal,
- generate atau pembatalan agenda,
- mulai dan selesai presensi,
- submit, approval, koreksi, lock, dan void attendance,
- input dan koreksi `AttendanceItem`,
- perubahan `StudentEnrollment`,
- perubahan `StudentGuardian`,
- perubahan status agenda,
- perubahan role dan permission.
