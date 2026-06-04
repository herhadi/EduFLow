# API MVP

Endpoint berikut bersifat dasar untuk memvalidasi flow backend sebelum frontend lengkap dibuat.

## Academic Read API

```http
GET /api/academic/school-years
GET /api/academic/semesters
GET /api/academic/semesters?schoolYearId=:schoolYearId
GET /api/academic/classes
GET /api/academic/classes?schoolYearId=:schoolYearId
GET /api/academic/subjects
GET /api/academic/teachers
GET /api/academic/students
GET /api/academic/students?classId=:classId
GET /api/academic/schedules
GET /api/academic/schedules?classId=:classId
GET /api/academic/agendas
GET /api/academic/agendas?date=2026-06-03
```

## Schedule Management API

### Buat Jadwal

```http
POST /api/academic/schedules
Content-Type: application/json

{
  "schoolYearId": "uuid-tahun-ajaran",
  "semesterId": "uuid-semester",
  "classId": "uuid-kelas",
  "subjectId": "uuid-mapel",
  "teacherId": "uuid-guru",
  "dayOfWeek": 1,
  "startsAt": "07:00",
  "endsAt": "08:30"
}
```

### Edit Jadwal

```http
PATCH /api/academic/schedules/:id
```

Payload sama seperti buat jadwal dan boleh parsial.

### Nonaktifkan Jadwal

```http
DELETE /api/academic/schedules/:id
```

Jadwal dinonaktifkan dengan soft delete.

### Generate Agenda

```http
POST /api/academic/schedules/:id/generate-agenda
Content-Type: application/json

{
  "date": "2026-06-04"
}
```

Efek:

- membuat `DailyAgenda` dari template `Schedule`,
- memakai `Schedule` sebagai template tetap,
- idempotent terhadap kombinasi `scheduleId + date`,
- jika agenda sudah ada, generate dilewati.

## Attendance Workflow API

### Buka Kelas

```http
POST /api/attendance/open-class
Content-Type: application/json

{
  "agendaId": "uuid-agenda"
}
```

Efek:

- membuat `Attendance` state `DRAFT`,
- membuat `AttendanceItem` dari `StudentEnrollment` aktif,
- mengubah `DailyAgenda.status` ke `IN_PROGRESS`.

### Submit Presensi

```http
POST /api/attendance/submit
Content-Type: application/json

{
  "attendanceId": "uuid-attendance",
  "notes": "KBM berjalan lancar",
  "items": [
    {
      "attendanceItemId": "uuid-item",
      "status": "PRESENT"
    }
  ]
}
```

Efek:

- update status setiap `AttendanceItem`,
- mengubah `Attendance.state` ke `SUBMITTED`,
- mengubah `DailyAgenda.status` ke `COMPLETED`,
- enqueue job `attendance:summary:daily`.

### Detail Attendance

```http
GET /api/attendance/:id
```

Mengembalikan attendance, agenda, kelas, mapel, guru, siswa, dan enrollment.

## Notification Center API

```http
GET /api/notifications/sent
GET /api/notifications/pending
GET /api/notifications/failed
GET /api/notifications/retry
GET /api/notifications/templates
POST /api/notifications/retry/:id
```

Catatan:

- `sent` membaca `NotificationLog.status = SENT`.
- `pending` membaca `NotificationLog.status = PENDING`.
- `failed` membaca `NotificationLog.status = FAILED`.
- `retry` membaca notifikasi gagal yang bisa dikirim ulang.
- `POST /retry/:id` hanya menerima notifikasi gagal.
- Retry mengubah status menjadi `PENDING` dan enqueue job ke `notification-send`.
- Template masih tersedia via API untuk tahap berikutnya, tetapi tidak ditampilkan di UI utama.

## Monitoring & Operational Dashboard API

```http
GET /api/reporting/operational/today
```

Mengembalikan ringkasan hari ini untuk operator dan kepala sekolah:

- kelas hari ini, sedang berlangsung, selesai, kelas kosong, dan belum submit,
- total guru mengajar, sudah submit, dan belum submit,
- siswa hadir, sakit, izin, dan alpha,
- reminder terkirim, summary terkirim, dan notifikasi gagal.

## Audit & Activity Center API

```http
GET /api/audit/activity
```

Mengembalikan timeline aktivitas operasional dari:

- `AuditLog` untuk perubahan domain penting,
- `NotificationLog` untuk status pengiriman notifikasi.

Contoh aktivitas:

```text
08:01 Guru A submit presensi
08:15 Operator approve presensi
08:20 Summary dikirim
09:00 Jadwal diubah
```

## Health & Operations Center API

```http
GET /api/operations/dashboard
POST /api/operations/jobs/retry
POST /api/operations/jobs/discard
```

Dashboard operasi menampilkan:

- health Redis, queue, worker, database, dan notification,
- queue monitoring untuk reminder, summary, notification, dan report,
- failed jobs lintas queue,
- payload job untuk debugging,
- aksi retry dan discard untuk failed job.

Payload retry/discard:

```json
{
  "queueName": "attendance-summary",
  "jobId": "1"
}
```

## Import Data API

```http
POST /api/academic/import/teachers
POST /api/academic/import/students
POST /api/academic/import/classes
POST /api/academic/import/subjects
POST /api/academic/import/schedules
Content-Type: multipart/form-data
```

Field upload:

```text
file: Guru.xlsx | Siswa.xlsx | Kelas.xlsx | Mapel.xlsx | Jadwal.xlsx
```

Format kolom:

| File | Kolom minimal |
| --- | --- |
| `Guru.xlsx` | `nama`, `nip`, `nuptk`, `email`, `no_hp`, `telegram_id`, `status` |
| `Siswa.xlsx` | `nama`, `nis`, `nisn`, `jenis_kelamin`, `tanggal_lahir`, `kelas`, `tahun_ajaran`, `nama_wali`, `hp_wali`, `telegram_id_wali`, `alamat_wali`, `status` |
| `Kelas.xlsx` | `nama`, `kode`, `tingkat`, `tahun_ajaran`, `wali_kelas` |
| `Mapel.xlsx` | `nama`, `kode`, `status` |
| `Jadwal.xlsx` | `tahun_ajaran`, `semester`, `kelas`, `kode_mapel`, `guru`, `hari`, `mulai`, `selesai`, `ruang`, `status` |

Catatan:

- Import jadwal membutuhkan data tahun ajaran, semester, kelas, mapel, dan guru sudah ada.
- `semester` menerima `ganjil`, `genap`, `odd`, `even`, `1`, atau `2`.
- `hari` menerima nama hari Indonesia/Inggris atau angka `1-7`.
- `status` menerima nilai aktif secara default. Nilai `nonaktif`, `inactive`, `false`, `0`, atau `tidak` dianggap nonaktif.
- Reminder guru memakai `Teacher.phone` atau `Teacher.telegramId`.
- Notifikasi wali murid memakai `Guardian.phone` atau `Guardian.telegramId`.
- Semua import menghasilkan ringkasan `created`, `updated`, `skipped`, dan `errors`.

## Demo Flow

```http
POST /api/attendance/demo/teacher-flow
```

Endpoint demo menjalankan:

```text
Guru mendapat reminder
-> Guru buka kelas
-> Attendance terbuat
-> Guru submit
-> Summary terkirim
-> SELESAI
```

Endpoint ini sementara dan boleh dihapus setelah flow production stabil.
