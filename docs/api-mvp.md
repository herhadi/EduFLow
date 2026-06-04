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

## Security & Access Control API

```http
POST /api/auth/login
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
GET /api/auth/sessions
POST /api/auth/sessions/revoke
GET /api/auth/login-audit
```

Target MVP:

- login audit,
- failed login tracking,
- account lockout,
- password reset flow,
- session revocation.

### Login Audit Dan Failed Login

Setiap login membuat `LoginAudit`:

- `SUCCESS` jika login berhasil,
- `FAILED` jika password/email salah,
- `LOCKED` jika akun sedang terkunci.

Account lockout:

- gagal login 5 kali mengunci akun selama 15 menit,
- login sukses mereset `failedLoginCount`,
- reset password juga membuka lock akun.

### Password Reset

```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "operator@eduflow.test"
}
```

MVP response mengembalikan `resetToken` agar mudah dites lokal. Saat production,
token ini harus dikirim via Notification Module dan tidak dikembalikan ke client.

```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "password-baru"
}
```

Efek:

- update password,
- menandai reset token sudah dipakai,
- revoke semua refresh token aktif,
- reset failed login count dan lockout.

### Session Management

```http
GET /api/auth/sessions
POST /api/auth/sessions/revoke
Content-Type: application/json

{
  "refreshToken": "optional-refresh-token"
}
```

Catatan:

- Jika `refreshToken` dikirim, hanya sesi tersebut yang dicabut.
- Jika body kosong, semua sesi aktif user dicabut.
- `RefreshToken.revokedReason` menyimpan alasan revoke seperti `logout`, `rotated`, `password_reset`, atau `manual_revoke`.

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

## Teacher Performance Dashboard API

```http
GET /api/reporting/teacher-performance
GET /api/reporting/teacher-performance?from=2026-06-01&to=2026-06-30
```

Mengembalikan performa guru untuk kepala sekolah:

- total sesi mengajar dari `DailyAgenda`,
- jumlah sesi yang sudah submit,
- jumlah presensi terlambat submit,
- jumlah kelas kosong,
- jumlah belum submit,
- submit rate,
- aktivitas mengajar terbaru per guru.

Definisi MVP:

- `Mengajar` dihitung dari `DailyAgenda` selain status `CANCELLED`.
- `Terlambat Submit` dihitung jika `Attendance.submittedAt` lebih lambat dari `Schedule.endsAt` pada tanggal agenda.
- `Kelas Kosong` dihitung dari `DailyAgenda.status = EMPTY`.
- Jika query tanggal tidak dikirim, periode default adalah 30 hari terakhir.

## Export & Reporting API

```http
GET /api/reporting/exports/attendance-summary?format=excel&date=2026-06-04
GET /api/reporting/exports/attendance-summary?format=pdf&date=2026-06-04
GET /api/reporting/exports/teacher-teaching?format=excel&date=2026-06-04
GET /api/reporting/exports/empty-classes?format=pdf&date=2026-06-04
GET /api/reporting/exports/student-attendance?format=excel&date=2026-06-04
```

Tipe laporan:

| Report Type | Nama |
| --- | --- |
| `attendance-summary` | Rekap Kehadiran |
| `teacher-teaching` | Rekap Guru Mengajar |
| `empty-classes` | Kelas Kosong |
| `student-attendance` | Presensi Siswa |

Format:

- `excel` menghasilkan file `.xlsx`.
- `pdf` menghasilkan file `.pdf`.

## Parent Portal API

```http
GET /api/parent-portal/summary?contact=09561186917
GET /api/parent-portal/summary?contact=648351920
```

Fungsi:

- mencari wali murid berdasarkan `Guardian.phone`, `Guardian.telegramId`, atau `Guardian.email`,
- menampilkan anak yang terhubung melalui `StudentGuardian`,
- menampilkan kelas aktif dari `StudentEnrollment`,
- menampilkan ringkasan presensi hari ini,
- menampilkan riwayat presensi 30 hari terakhir.

Response utama:

```json
{
  "data": {
    "guardian": {
      "id": "uuid-wali",
      "name": "Nama Wali",
      "phone": "09561186917",
      "telegramId": "648351920"
    },
    "date": "2026-06-04",
    "summary": {
      "present": 1,
      "sick": 0,
      "excused": 0,
      "absent": 0,
      "total": 1
    },
    "students": [
      {
        "id": "uuid-siswa",
        "name": "Nama Siswa",
        "activeClass": {
          "name": "VII A",
          "schoolYear": "2026/2027"
        },
        "todaySummary": {},
        "dailySummary": [],
        "history": []
      }
    ]
  }
}
```

Catatan:

- Endpoint ini masih public untuk MVP/demo.
- Saat authentication parent sudah dibuat, lookup sebaiknya memakai user session, bukan query `contact`.
- Data yang ditampilkan hanya anak yang terhubung dengan wali tersebut.

## Finance Foundation API

```http
GET /api/finance/fee-types
GET /api/finance/payment-methods
GET /api/finance/invoices
GET /api/finance/invoices?studentId=:studentId
GET /api/finance/invoices?guardianId=:guardianId
GET /api/finance/payments
GET /api/finance/payments?invoiceId=:invoiceId
GET /api/finance/payments?studentId=:studentId
```

Domain awal:

| Entity | Fungsi |
| --- | --- |
| `FeeType` | Master jenis biaya seperti SPP, daftar ulang, seragam, dan kegiatan. |
| `Invoice` | Tagihan siswa per jenis biaya, periode, tahun ajaran, dan wali terkait. |
| `Payment` | Catatan pembayaran terhadap invoice. |
| `PaymentMethod` | Master metode pembayaran seperti tunai, transfer bank, VA, e-wallet, dan QRIS. |

Status awal:

- `InvoiceStatus`: `DRAFT`, `ISSUED`, `PARTIAL`, `PAID`, `OVERDUE`, `VOID`.
- `PaymentStatus`: `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUNDED`.
- `PaymentMethodType`: `CASH`, `BANK_TRANSFER`, `VIRTUAL_ACCOUNT`, `EWALLET`, `QRIS`, `OTHER`.

Catatan:

- Tahap ini baru foundation, belum payment gateway.
- Pembayaran tidak boleh mengubah invoice tanpa transaction ketika workflow pembayaran dibuat.
- Notifikasi tagihan/pembayaran nanti tetap lewat Notification Module.
- Audit wajib ditambahkan saat create/update invoice dan konfirmasi payment mulai dibuat.

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
GET /health
GET /health/database
GET /health/redis
GET /health/queue
GET /api/operations/dashboard
POST /api/operations/jobs/retry
POST /api/operations/jobs/discard
```

Health endpoint publik tanpa prefix `/api` digunakan untuk uptime check, container
health check, dan monitoring eksternal.

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

## Monitoring & Observability

Fitur observability awal:

- correlation ID lewat header `x-correlation-id`,
- jika request tidak membawa correlation ID, backend membuat UUID baru,
- response selalu mengembalikan header `x-correlation-id`,
- request logging mencatat method, path, durasi, status, dan correlation ID,
- error tracking global mencatat exception dengan correlation ID,
- queue logging mencatat enqueue, started, completed, dan failed job.

Contoh request:

```http
GET /health
x-correlation-id: demo-correlation-id
```

Contoh response error:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "demo-correlation-id"
}
```

Catatan:

- Logging saat ini memakai Nest Logger.
- Integrasi Sentry/OpenTelemetry/Datadog belum dipasang agar MVP tetap ringan.
- Jika job dibuat dari request, payload job sebaiknya membawa `correlationId`.

## Backup & Recovery

Script operasional:

```bash
./infra/backup/backup-postgres.sh
CONFIRM_RESTORE=eduflow ./infra/backup/restore-postgres.sh backups/postgres/eduflow-YYYYMMDD-HHMMSS.dump

./infra/backup/backup-redis.sh
CONFIRM_RESTORE=eduflow ./infra/backup/restore-redis.sh backups/redis/redis-YYYYMMDD-HHMMSS.rdb
```

Dokumentasi lengkap:

```txt
docs/backup-recovery.md
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
