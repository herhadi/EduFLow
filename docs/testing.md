# Strategi Pengujian

Struktur pengujian backend berada di `apps/backend/test`.

## Jenis Pengujian

- `unit`: service, helper, dan aturan domain tanpa dependency eksternal.
- `integration`: Prisma, Redis, BullMQ, dan listener event.
- `e2e`: endpoint HTTP dan alur utama dari sisi pengguna.

## Prioritas Awal

1. Autentikasi dan permission guard.
2. Generate agenda harian dari jadwal.
3. Presensi siswa terhadap agenda harian.
4. Scheduler hanya membuat job.
5. Worker memproses queue yang sesuai.
6. Event memicu queue tanpa memanggil provider langsung.

