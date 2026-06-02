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
- `queue`: registrasi dan orkestrasi BullMQ.
- `workers`: pemroses background job.
- `modules`: domain bisnis.

## Modul Domain

- `auth`: autentikasi, refresh token, JWT, RBAC, dan permission.
- `academic`: students, teachers, classes, schedules, subjects, semesters, dan school years.
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
