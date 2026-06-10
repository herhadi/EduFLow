# Arsitektur EduFlow

## Bentuk Aplikasi

EduFlow menggunakan monorepo dan modular monolith:

- `frontend`: aplikasi Next.js App Router.
- `backend`: API NestJS dan host worker.
- `packages/shared`: tipe, helper, dan konstanta lintas aplikasi.

PostgreSQL adalah sumber data utama. Redis hanya digunakan untuk queue, cache, rate limiting, scheduler, dan state sementara.

## Lapisan Backend

- `common`: runtime concern lintas modul seperti guard, decorator, interceptor, dan exception.
- `core`: abstraksi fondasi backend seperti base entity, pagination, response, logging, dan domain utility.
- `config`: konfigurasi aplikasi.
- `infrastructure`: adapter pihak ketiga seperti Redis, WhatsApp, Telegram, email, dan storage.
- `prisma`: akses database.
- `queue`: gateway enqueue job dan registrasi BullMQ.
- `workers`: pemroses background job.
- `modules`: domain bisnis.

## Modul Domain

- `auth`: autentikasi, refresh token, JWT, RBAC, dan permission.
- `academic`: students, teachers, classes, schedules, subjects, semesters, dan school years.
- `academic-planning`: kalender pendidikan, program tahunan, program semester, KKTP, perencanaan pembelajaran, buku KBM, dan nilai siswa.
- `attendance`: agenda harian, presensi siswa, aktivitas guru, status kelas, dan summary.
- `notification`: channels, templates, processors, dan providers.
- `scheduler`: membuat recurring atau delayed job saja.
- `reporting`: dashboard, statistik, dan laporan sekolah.
- `audit`: log aktivitas, audit trail, dan riwayat perubahan.

## Alur Akademik

```text
Schedule
  -> Generate Daily Agenda
  -> Attendance & Activity
  -> Publish Domain Event
  -> Queue Job
  -> Worker Process
```

Presensi wajib mengacu pada `DailyAgenda`, bukan langsung pada `Schedule`.

## Otorisasi

API menerapkan authentication guard dan permission guard secara global. Endpoint publik harus menggunakan `@Public()`. Endpoint khusus menggunakan `@RequirePermissions(...)`, bukan pengecekan role yang di-hardcode.

## Dokumen Operasional

- `docs/database.md`: desain relasi akademik.
- `docs/events.md`: event flow sistem nyata.
- `docs/attendance-workflow.md`: alur guru, siswa, dan kelas kosong.
- `docs/attendance-state.md`: workflow state presensi untuk koreksi, approval, audit, dan summary.
- `docs/queues.md`: strategi queue, job naming, retry, dan idempotency.
- `docs/permission-matrix.md`: role, capability, dan scope data.
- `docs/academic-planning.md`: pembagian admin dan guru untuk kalender pendidikan, perangkat ajar, dan nilai siswa.

## Batas Infra

Domain module tidak boleh membuat koneksi Redis atau memanggil BullMQ langsung. Domain module memakai gateway queue, sedangkan konfigurasi provider berada di `apps/backend/src/infrastructure`.

Tidak masuk infra: attendance logic, auth logic, approval flow, reporting rule, dan schedule generation. Semua itu tetap domain logic.
