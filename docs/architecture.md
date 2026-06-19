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

## Struktur Frontend Admin

Area admin dipisahkan berdasarkan domain agar halaman tidak terlalu besar dan lebih mudah dirawat:

```text
/admin
  /guru
  /akademik
  /akses
```

- `/admin`: hub atau menu utama administrasi.
- `/admin/guru`: akun login guru, role, mapel ampu, dan kelas binaan wali kelas.
- `/admin/akademik`: CRUD kelas dan mata pelajaran.
- `/admin/akses`: user sistem, role, permission, nonaktif, dan hapus permanen.
- `/schedules`: manajemen jadwal tetap dan generate agenda.

Komponen feedback aksi memakai `ToastProvider` global di root layout. Komponen fitur menggunakan `useToast()` dan tidak membuat implementasi toast sendiri-sendiri.

Frontend memakai Tailwind CSS v4 dengan theme global di `apps/frontend/app/globals.css`.

Landing page publik memakai lebar frame yang sama dengan shell aplikasi setelah login: mobile tetap `max-w-md`, sedangkan desktop memakai lebar hampir penuh viewport melalui `md:w-[calc(100%-1.5rem)]` dan `xl:w-[calc(100%-2rem)]`. Tujuannya agar pengalaman desktop konsisten dengan menu aplikasi lain.

Navigasi frontend memakai role-based mobile shell:

- bottom navigation berisi menu utama sesuai role user login,
- top navigation berisi submenu dari section aktif,
- konfigurasi menu dipusatkan di `apps/frontend/lib/navigation.config.ts`,
- root dianggap role teknis/setup, bukan menu operasional harian untuk semua user.

Dashboard frontend dipisahkan per role agar beranda setiap actor dapat berkembang tanpa saling bertabrakan:

```text
/dashboard                  root
/dashboard/admin            operator_sekolah
/dashboard/kepala-sekolah   kepala_sekolah
/dashboard/guru             guru
/dashboard/wali-kelas       wali_kelas
/dashboard/orang-tua        orang_tua
/dashboard/tu               tu
/dashboard/bk               bk
```

`/dashboard` tetap menjadi dashboard root. User non-root yang membuka `/dashboard` diarahkan ke dashboard sesuai role. Login juga mengarahkan user ke dashboard role masing-masing. Jika user memiliki role `wali_kelas` dan `guru`, prioritas dashboard adalah `wali_kelas`.

Bottom navigation menggunakan label `Inbox` untuk pusat notifikasi dan `Profil` untuk area akun. Item `Inbox` menampilkan badge/dot saat ada notifikasi yang perlu dibaca atau ditindaklanjuti.

## Dokumen Operasional

- `docs/database.md`: desain relasi akademik.
- `docs/events.md`: event flow sistem nyata.
- `docs/attendance-workflow.md`: alur guru, siswa, dan kelas kosong.
- `docs/attendance-state.md`: workflow state presensi untuk koreksi, approval, audit, dan summary.
- `docs/queues.md`: strategi queue, job naming, retry, dan idempotency.
- `docs/permission-matrix.md`: role, capability, dan scope data.
- `docs/academic-planning.md`: pembagian admin dan guru untuk kalender pendidikan, perangkat ajar, dan nilai siswa.
- `docs/admin-workflow.md`: route admin dan urutan konfigurasi awal sekolah.

## Batas Infra

Domain module tidak boleh membuat koneksi Redis atau memanggil BullMQ langsung. Domain module memakai gateway queue, sedangkan konfigurasi provider berada di `apps/backend/src/infrastructure`.

Tidak masuk infra: attendance logic, auth logic, approval flow, reporting rule, dan schedule generation. Semua itu tetap domain logic.
