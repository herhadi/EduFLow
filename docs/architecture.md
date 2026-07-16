# Arsitektur EduFlow

## Bentuk Aplikasi

EduFlow menggunakan monorepo dan modular monolith:

- `frontend`: aplikasi Next.js App Router.
- `backend`: API NestJS dan host worker.
- `packages/shared`: tipe, helper, dan konstanta lintas aplikasi.

PostgreSQL adalah sumber data utama. Redis hanya digunakan untuk queue, cache, rate limiting, scheduler, dan state sementara.

## Arsitektur Deployment Production

Production berjalan sebagai satu stack Docker Compose pada server Debian. GitHub tetap menjadi source of truth dan deployment normal dilakukan oleh GitHub Actions self-hosted runner.

```text
Developer
  -> Git push ke main
  -> GitHub Actions
  -> Self-hosted runner di server Debian
  -> scripts/deploy.sh
  -> Docker Compose
  -> Frontend, Backend, PostgreSQL, Redis
  -> Cloudflare Tunnel
  -> Domain sekolah
```

Frontend menjadi pintu masuk browser. Untuk pola satu stack, browser memanggil `/api/backend`, lalu route proxy Next.js meneruskan request ke backend internal `http://backend:3001/api`.

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

## Struktur Academic Module Backend

`AcademicController` tetap menjadi pintu kompatibilitas endpoint `/api/academic`, tetapi `AcademicService` hanya berperan sebagai facade tipis. Logika domain akademik dipisahkan ke service kecil berdasarkan tanggung jawab:

| Service | Tanggung jawab |
| --- | --- |
| `AcademicMasterService` | Tahun ajaran, semester, kelas, wali kelas, mata pelajaran, slot jam, aktivitas slot kelas, dan salin master tahun ajaran |
| `AcademicCalendarService` | Kaldik/event akademik, validasi rentang tahun ajaran, dan blok agenda |
| `AcademicScheduleService` | CRUD jadwal, bulk jadwal, revisi jadwal, cancel revisi, dan validasi konflik jadwal efektif |
| `AgendaGenerationService` | Generate agenda, bulk generate, coverage agenda, tanggal blokir Kaldik, dan reminder guru sebelum kelas |
| `AgendaManagementService` | Daftar agenda harian dan penetapan guru pengganti pada `DailyAgenda` |
| `TeacherAcademicService` | Administrasi guru: identitas, foto, akun login, reset password, mapel ampu, penugasan tahun ajaran, dan penghapusan guru |
| `TeacherPortalService` | Endpoint personal guru/wali kelas: jadwal saya, mapel saya, agenda saya, dan kelas binaan |
| `StudentAcademicService` | Daftar siswa akademik beserta enrollment dan wali |

Prinsipnya: controller menjaga kontrak API, facade menjaga kompatibilitas internal, sedangkan perubahan aturan bisnis dilakukan di service domain yang sesuai. Service baru tidak boleh saling memanggil secara melingkar; jika sebuah workflow melintasi domain besar, gunakan event atau queue sesuai kebutuhan.

## Alur Akademik

```text
Schedule
  -> Scheduler membuat job generate agenda
  -> Worker membuat DailyAgenda
  -> Attendance & Activity
  -> Publish Domain Event
  -> Queue membuat job notifikasi atau summary
  -> Worker memproses pengiriman atau laporan
```

Presensi wajib mengacu pada `DailyAgenda`, bukan langsung pada `Schedule`.
Scheduler hanya membuat job. Proses asynchronous seperti generate agenda, reminder, notifikasi, dan summary diproses oleh worker.

## Otorisasi

API menerapkan authentication guard dan permission guard secara global. Endpoint publik harus menggunakan `@Public()`. Endpoint khusus menggunakan `@RequirePermissions(...)`, bukan pengecekan role yang di-hardcode.

## Struktur Frontend Admin

Area admin dipisahkan berdasarkan domain agar halaman tidak terlalu besar dan lebih mudah dirawat:

```text
/admin
  /dashboard
  /data
  /guru
  /akademik
  /schedules
  /import-data

/system
  /dashboard
  /access
  /telegram
  /audit
  /notifications
  /profile
```

- `/admin` dan `/admin/data`: hub atau menu utama master administrasi.
- `/admin/dashboard`: beranda operator sekolah.
- `/admin/guru`: akun login guru, role, mapel ampu, dan kelas binaan wali kelas.
- `/admin/akademik`: CRUD kelas dan mata pelajaran.
- `/admin/schedules`: manajemen jadwal tetap dan generate agenda.
- `/admin/import-data`: import data guru dan siswa.
- `/system/dashboard`: beranda root untuk support teknis.
- `/system/access`: user sistem, role, permission, nonaktif, dan hapus permanen.
- `/system/telegram`: konfigurasi webhook dan monitoring Telegram bot.
- `/system/audit`: audit trail untuk aktivitas penting.

Route lama seperti `/schedules`, `/import-data`, dan `/audit` tetap disediakan sebagai kompatibilitas, tetapi navigasi operator memakai namespace `/admin/...`.

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
/system/dashboard           root
/admin/dashboard            operator_sekolah
/principal/dashboard        kepala_sekolah
/teacher/dashboard          guru, wali_kelas
/parent/dashboard           orang_tua
/dashboard/tu               tu
/dashboard/bk               bk
```

Root adalah role support teknis dan memakai namespace `/system/*`, sedangkan operator sekolah memakai namespace `/admin/*` untuk operasional akademik harian. User yang membuka namespace role yang tidak sesuai diarahkan ke dashboard sesuai role. Login juga mengarahkan user ke dashboard role masing-masing. Jika user memiliki role `wali_kelas` dan `guru`, dashboard tetap memakai alur guru harian dengan menu tambahan `Binaan`.

Bottom navigation menggunakan label `Inbox` untuk pusat notifikasi dan `Profil` untuk area akun. Route Inbox dan Profil mengikuti namespace role, misalnya `/admin/notifications`, `/teacher/profile`, `/principal/notifications`, dan `/system/profile`; route lama `/notifications` dan `/profile` hanya menjadi kompatibilitas. Item `Inbox` menampilkan badge/dot saat ada notifikasi yang perlu dibaca atau ditindaklanjuti.

## Dokumen Operasional

- `docs/database.md`: desain relasi akademik.
- `docs/api-contract.md`: kontrak response JSON backend.
- `docs/api-endpoints.md`: referensi endpoint API utama.
- `docs/events.md`: event flow sistem nyata.
- `docs/attendance-workflow.md`: alur guru, siswa, kelas kosong, state presensi, koreksi, approval, audit, dan summary.
- `docs/queues.md`: strategi queue, job naming, retry, dan idempotency.
- `docs/permission-matrix.md`: role, capability, dan scope data.
- `docs/academic-planning.md`: pembagian operator sekolah dan guru untuk kalender pendidikan, perangkat ajar, dan nilai siswa.
- `docs/operator-workflow.md`: route operator sekolah dan urutan konfigurasi awal sekolah.
- `docs/operational-scenarios.md`: skenario operasional dan strategi pengujian.
- `docs/deployment.md`: deployment lokal, Docker Compose, dan CI/CD.
- `docs/infrastructure.md`: server production, domain, runner, tunnel, struktur operasional, dan prinsip security production.
- `docs/backup-recovery.md`: prosedur backup dan restore PostgreSQL/Redis.

## Batas Infra

Domain module tidak boleh membuat koneksi Redis atau memanggil BullMQ langsung. Domain module memakai gateway queue, sedangkan konfigurasi provider berada di `apps/backend/src/infrastructure`.

Tidak masuk infra: attendance logic, auth logic, approval flow, reporting rule, dan schedule generation. Semua itu tetap domain logic.

## Kebijakan Data Operasional

EduFlow tidak mempertahankan mode data contoh di runtime production. Endpoint, service, UI, seed otomatis, dan fallback angka yang membuat data contoh tidak boleh ditambahkan ke alur utama. Data yang tampil di dashboard harus berasal dari PostgreSQL atau bernilai kosong ketika backend belum dapat memuat data.
