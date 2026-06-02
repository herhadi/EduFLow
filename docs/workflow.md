# Alur Kerja

## Alur Akademik Harian

```text
Schedule
  -> Scheduler membuat job generate agenda
  -> Worker membuat DailyAgenda
  -> Guru mengisi aktivitas dan presensi siswa
  -> Domain menerbitkan event spesifik
  -> Orkestrasi queue membuat job notifikasi atau summary
  -> Worker memproses pengiriman atau laporan
```

Scheduler hanya membuat job. Worker menangani proses asynchronous.

