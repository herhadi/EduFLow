# API MVP

## Academic Planning

- `GET /api/academic-planning/mine`
- `POST /api/academic-planning`
- `POST /api/academic-planning/:id/attachment`
- `GET /api/academic-planning/:id/attachment-url`
- `PATCH /api/notifications/mine/:id/read`
- `POST /api/academic-planning/:id/submit`
- `GET /api/academic-planning/review-queue`
- `PATCH /api/academic-planning/:id/review`

Endpoint berikut bersifat dasar untuk memvalidasi flow backend sebelum frontend lengkap dibuat.

## Auth API

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "root",
  "password": "password"
}
```

`username` boleh berisi username atau email. Session aktif 24 jam.

Response login membawa `user.mustChangePassword`. Nilai ini `true` jika password user masih sama dengan `DEFAULT_USER_PASSWORD`. Frontend wajib menahan redirect dashboard dan menampilkan form ganti password sebelum user melanjutkan.

### Ganti Password Default

```http
POST /api/auth/change-initial-password
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "newPassword": "baru123",
  "repeatPassword": "baru123"
}
```

Aturan:

- hanya dipakai setelah login berhasil ketika `user.mustChangePassword` bernilai `true`,
- `newPassword` dan `repeatPassword` harus sama,
- password baru tidak boleh sama dengan `DEFAULT_USER_PASSWORD`,
- panjang password minimal 6 dan maksimal 10 karakter,
- setelah berhasil, backend mengisi `passwordChangedAt` dan mengembalikan data user terbaru,
- frontend menyimpan session terbaru dan mengarahkan user ke dashboard sesuai role.

`POST /api/auth/change-password` dipakai dari halaman Profil setelah user login. Request membawa `currentPassword`, `newPassword`, dan `repeatPassword`. Backend memvalidasi password lama, menolak password default, mengisi `passwordChangedAt`, lalu mencabut semua refresh token aktif agar user login ulang.

### User Management

```http
GET /api/auth/users
POST /api/auth/users
POST /api/auth/users/:id/roles
PATCH /api/auth/users/:id/deactivate
DELETE /api/auth/users/:id
```

Permission:

- `user.manage`

Root memakai endpoint ini untuk menentukan siapa `operator_sekolah`, `kepala_sekolah`, `guru`, `tu`, `bk`, `wali_kelas`, atau `orang_tua`.

Aturan penghapusan:

- akun sendiri tidak dapat dinonaktifkan atau dihapus,
- minimal satu root harus tetap aktif,
- hard delete akan ditolak jika user sudah dipakai histori operasional,
- gunakan nonaktif untuk akun real yang pernah beraktivitas.

## Academic Read API

```http
GET /api/academic/school-years
POST /api/academic/school-years
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

## Academic Master Management API

### Tambah Kelas

```http
POST /api/academic/classes
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "schoolYearId": "uuid-tahun-ajaran",
  "name": "VII-I",
  "code": "VIIII",
  "grade": "VII"
}
```

### Hapus Kelas

```http
DELETE /api/academic/classes/:id
Authorization: Bearer <accessToken>
```

Kelas hanya dapat dihapus jika belum memiliki enrollment siswa, jadwal, atau agenda.

### Tambah Mata Pelajaran

```http
POST /api/academic/subjects
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Muatan Lokal",
  "code": "MULOK"
}
```

### Hapus Mata Pelajaran

```http
DELETE /api/academic/subjects/:id
Authorization: Bearer <accessToken>
```

Mapel hanya dapat dihapus jika belum dipakai jadwal atau agenda. Relasi mapel ampu guru akan ikut dibersihkan.

Permission seluruh endpoint master akademik:

- `academic.manage`

UI tersedia di `/admin/akademik`.

## Teacher Management API

### Nonaktifkan Guru

```http
DELETE /api/academic/teachers/:id
Authorization: Bearer <accessToken>
```

Permission:

- `academic.manage`

Efek:

- `Teacher.deletedAt` terisi,
- `Teacher.isActive` menjadi `false`,
- jadwal aktif guru ikut dinonaktifkan,
- relasi wali kelas pada `Class.homeroomTeacherId` dilepas jika ada,
- histori `DailyAgenda`, `Attendance`, dan laporan lama tetap aman.

### Hapus Permanen Guru

```http
DELETE /api/academic/teachers/:id/permanent
Authorization: Bearer <accessToken>
```

Hard delete hanya diizinkan jika guru belum mempunyai histori jadwal atau agenda. Untuk guru real yang sudah beraktivitas, gunakan nonaktif.

### Atur Akun Dan Role Guru

```http
PATCH /api/academic/teachers/:id/account
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "username": "guru.matematika",
  "email": "guru.matematika@sekolah.sch.id",
  "password": "123456",
  "roles": ["guru"]
}
```

Jika `password` dikosongkan saat membuat akun guru baru, backend memakai `DEFAULT_USER_PASSWORD` dari `apps/backend/.env`. Aturan panjang password: minimal 6 dan maksimal 10 karakter.

Contoh kepala sekolah:

```json
{
  "username": "kepala.sekolah",
  "roles": ["kepala_sekolah"]
}
```

Permission:

- `academic.manage`

Catatan:

- Jabatan sistem seperti `kepala_sekolah`, `guru`, `wali_kelas`, `bk`, dan `tu` disimpan sebagai role user.
- Identitas guru tetap di tabel `Teacher`.

### Atur Mapel Ampu Guru

```http
PATCH /api/academic/teachers/:id/subjects
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "subjectIds": ["uuid-mapel-matematika"]
}
```

Permission:

- `academic.manage`

Catatan:

- “Guru Matematika” bukan role baru.
- Role user tetap `guru`, sedangkan mapel ampu disimpan di `TeacherSubject`.

### Atur Wali Kelas

```http
PATCH /api/academic/classes/:id/homeroom-teacher
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "teacherId": "uuid-guru"
}
```

Permission:

- `academic.manage`

Catatan:

- Guru mapel belum tentu wali kelas.
- Wali kelas pasti guru mapel.
- Karena itu wali kelas disimpan sebagai penugasan kelas pada `Class.homeroomTeacherId`, bukan sebagai pengganti mapel ampu.
- Jika guru diberi role `wali_kelas`, sistem otomatis memastikan role `guru` juga ikut.

## Schedule Management API

Jadwal dan kalender pendidikan dikelola oleh `operator_sekolah`. Guru hanya membaca jadwal yang terkait dengan dirinya.

Jadwal wajib memilih slot waktu, kelas, mapel, dan guru. Guru yang dipilih harus sudah diatur mengampu mapel tersebut melalui relasi `TeacherSubject`. Jika kelas memiliki wali kelas, UI menampilkan informasi wali kelas sebagai konteks, tetapi jadwal tetap memakai guru pengajar mapel.

### Template Jam Pelajaran

```http
GET /api/academic/time-slots?schoolYearId=:schoolYearId
POST /api/academic/time-slots
```

Slot waktu menyimpan susunan jam per hari dan tahun ajaran. Slot kegiatan seperti Upacara, Senam Bersama, istirahat, atau sholat berjamaah menggunakan `isAssignable=false` sehingga terlihat dalam timeline tetapi tidak dapat diberi jadwal mapel.

### Buat Jadwal Banyak Kelas

```http
POST /api/academic/schedules/bulk
```

Payload memakai `timeSlotId` dan `classIds[]`. Seluruh jadwal dibuat dalam satu transaksi dan ditolak bila salah satu kelas atau guru mengalami bentrok.

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

## Academic Planning API

Endpoint berikut disiapkan untuk tahap berikutnya setelah schedule dan attendance stabil.

### Kalender Pendidikan

```http
GET /api/academic/calendar/events?schoolYearId={schoolYearId}
POST /api/academic/calendar/events
PATCH /api/academic/calendar/events/:id
DELETE /api/academic/calendar/events/:id
```

Kaldik dikelola oleh `operator_sekolah`. Setiap event terikat ke tahun ajaran, memiliki rentang tanggal, jenis event, serta `blocksAgenda`. Event dengan `blocksAgenda=true` dilewati oleh generate agenda manual maupun otomatis.

### Perangkat Ajar Guru

```http
GET /api/academic/planning/annual-programs
POST /api/academic/planning/annual-programs
GET /api/academic/planning/semester-programs
POST /api/academic/planning/semester-programs
GET /api/academic/planning/kktp
POST /api/academic/planning/kktp
GET /api/academic/planning/lesson-plans
POST /api/academic/planning/lesson-plans
GET /api/academic/planning/teaching-books
POST /api/academic/planning/teaching-books
POST /api/academic/planning/:type/:id/submit
POST /api/academic/planning/:type/:id/approve
POST /api/academic/planning/:type/:id/request-revision
```

Guru mengelola data ini untuk kelas dan mapel yang diampu:

- Program Tahunan,
- Program Semester,
- KKTP,
- Perencanaan Pembelajaran,
- data buku yang digunakan untuk KBM.

Kepala sekolah memakai endpoint approval/revisi untuk memonitor kelengkapan perangkat ajar guru.

### Nilai Siswa

```http
GET /api/academic/grades
POST /api/academic/grades
PATCH /api/academic/grades/:id
POST /api/academic/grades/semester-submissions
POST /api/academic/grades/semester-submissions/:id/approve
POST /api/academic/grades/semester-submissions/:id/request-revision
POST /api/academic/grades/semester-submissions/:id/lock
```

Nilai siswa harus mengacu ke `StudentEnrollment`, `Subject`, `Teacher`, `SchoolYear`, dan `Semester` agar histori akademik tetap aman.

Nilai semester harus disubmit guru dan di-approve kepala sekolah sebelum dikunci untuk rapor.

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

Session login:

- access token berlaku 24 jam,
- refresh token berlaku 24 jam,
- setelah 24 jam user harus login ulang,
- refresh token lama dicabut ketika refresh token baru dibuat.

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
- `RefreshToken` menyimpan `ipAddress` dan `userAgent` dari login agar halaman Profil dapat menampilkan perangkat aktif.
- `RefreshToken.revokedReason` menyimpan alasan revoke seperti `logout`, `rotated`, `password_reset`, atau `manual_revoke`.

Profil user:

```txt
GET /api/auth/me/profile
PATCH /api/auth/me/profile
POST /api/auth/me/profile/photo
POST /api/auth/me/telegram/link-token
POST /api/auth/telegram/link/confirm
```

`POST /api/auth/me/profile/photo` menerima multipart field `file` dengan format JPEG, PNG, atau WebP maksimal 2 MB. File disimpan melalui storage provider, sedangkan database menyimpan key dan metadata pada `User`. `telegramId` tidak diisi manual dari UI profil; UI membuat token aktivasi, membuka bot Telegram dengan parameter `start`, lalu bot mengirim token dan Telegram ID ke endpoint confirm agar `User.telegramId` tersimpan otomatis.

Backend menyediakan endpoint aktivasi, tetapi webhook atau service bot Telegram harus tetap menjalankan alur `/start <token>` dan memanggil `POST /api/auth/telegram/link/confirm`.

## Notification Center API

### Inbox Personal Guru dan Kepala Sekolah

```http
GET /api/notifications/mine
Authorization: Bearer <accessToken>
```

Response menyesuaikan role utama dan hanya berisi notifikasi yang ditujukan ke kontak akun login. Guru menerima reminder kelas, koreksi presensi, revisi perangkat ajar, dan status penilaian. Kepala Sekolah menerima approval perangkat ajar/nilai, kelas kosong, guru belum submit, koreksi penting, guru pengganti, ringkasan sekolah, dan pengumuman akademik.

Guru dan Kepala Sekolah tidak mendapat akses ke log global, retry queue, atau template provider.

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
GET /api/parent-portal/summary?contact=08561186917
```

Fungsi:

- mencari wali murid berdasarkan `Guardian.phone` atau `Guardian.email`,
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
      "phone": "08561186917"
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

- Endpoint ini masih public untuk MVP awal.
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
08:01 Guru mapel submit presensi
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
x-correlation-id: request-correlation-id
```

Contoh response error:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "request-correlation-id"
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
Content-Type: multipart/form-data
```

Field upload:

```text
file: Guru.xlsx | Siswa.xlsx
```

Format kolom:

| File | Kolom minimal |
| --- | --- |
| `Guru.xlsx` | `nama`, `nip`, `nuptk`, `email`, `no_hp`, `status` |
| `Siswa.xlsx` | `nama`, `nis`, `nisn`, `jenis_kelamin`, `tanggal_lahir`, `kelas`, `tahun_ajaran`, `nama_wali`, `hp_wali`, `alamat_wali`, `status` |

Catatan:

- Import hanya untuk data massal yang berat: guru dan siswa.
- Kelas, mata pelajaran, jadwal, role guru, mapel ampu, dan wali kelas diatur lewat halaman admin.
- Data siswa membutuhkan kelas dan tahun ajaran sudah tersedia.
- `status` menerima nilai aktif secara default. Nilai `nonaktif`, `inactive`, `false`, `0`, atau `tidak` dianggap nonaktif.
- Reminder guru memakai `Teacher.phone` atau `User.telegramId`.
- Notifikasi wali murid memakai `Guardian.phone`, `Guardian.email`, atau `User.telegramId` pada akun orang tua yang sudah aktivasi Telegram dari Profil.
- Semua import menghasilkan ringkasan `created`, `updated`, `skipped`, dan `errors`.
