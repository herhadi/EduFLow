# Struktur Pengujian Backend

Gunakan pembagian berikut:

- `unit/`: pengujian service, helper, dan aturan domain secara terisolasi.
- `integration/`: pengujian Prisma, Redis, queue, dan event listener.
- `e2e/`: pengujian alur HTTP utama dari sisi pengguna.

Prioritaskan pengujian untuk scheduler, antrean, event, autentikasi, agenda harian, dan presensi.

