# Alur Kerja

## Dokumen Terkait

- Database akademik: `docs/database.md`
- Event flow: `docs/events.md`
- Attendance workflow: `docs/attendance-workflow.md`
- Attendance state: `docs/attendance-state.md`
- Queue strategy: `docs/queues.md`
- Permission matrix: `docs/permission-matrix.md`
- Demo flow: `docs/demo-flow.md`
- Scenarios: `docs/scenarios.md`

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
