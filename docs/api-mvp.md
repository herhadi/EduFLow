# API MVP

Endpoint berikut bersifat dasar untuk memvalidasi flow backend sebelum frontend lengkap dibuat.

## Academic Read API

```http
GET /api/academic/school-years
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

