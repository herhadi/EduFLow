# Alur Kerja

## Dokumen Terkait

- Database akademik: `docs/database.md`
- Event flow: `docs/events.md`
- Attendance workflow: `docs/attendance-workflow.md`
- Attendance state: `docs/attendance-state.md`
- Queue strategy: `docs/queues.md`
- Permission matrix: `docs/permission-matrix.md`
- Scenarios: `docs/scenarios.md`
- API MVP: `docs/api-mvp.md`
- Deployment dan CI/CD: `docs/deployment.md`
- Infrastruktur production: `docs/infrastructure.md`
- Security: `docs/security.md`
- Changelog: `docs/changelog.md`

## Alur Akademik Harian

```text
Schedule
  -> Scheduler membuat job generate agenda
  -> Worker membuat DailyAgenda
  -> Guru membuat atau membuka Attendance
  -> Guru mengisi AttendanceItem siswa
  -> Domain menerbitkan event spesifik
  -> Orkestrasi queue membuat job notifikasi atau summary
  -> Worker memproses pengiriman atau laporan
```

Scheduler hanya membuat job. Worker menangani proses asynchronous.

## Kebijakan Data Operasional

EduFlow tidak mempertahankan mode data contoh di runtime production. Endpoint, service, UI, seed otomatis, dan fallback angka yang membuat data contoh tidak boleh ditambahkan ke alur utama. Data yang tampil di dashboard harus berasal dari PostgreSQL atau bernilai kosong ketika backend belum dapat memuat data.
