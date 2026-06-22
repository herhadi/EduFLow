# Changelog

Catatan perubahan penting yang bersifat operasional dan arsitektural.

## 2026-06-21

- Menambahkan CI/CD v1 dengan GitHub Actions self-hosted runner.
- Menambahkan `scripts/deploy.sh`, `scripts/healthcheck.sh`, dan helper logging/deploy.
- Menambahkan logging deployment ke `logs/deploy/`.
- Menambahkan Dockerfile frontend dan backend untuk pola Docker/VPS satu stack.
- Mendokumentasikan pola deployment `/api/backend` dan `BACKEND_INTERNAL_API_URL`.
- Memisahkan dokumentasi VPS ke dokumen operasional yang lebih spesifik.
- Memperbarui workflow deploy agar memakai `actions/checkout@v5`, menjalankan deploy via `bash`, dan menampilkan tail log saat gagal tanpa upload artifact.
- Memisahkan port publishing PostgreSQL/Redis ke `docker-compose.local.yml` agar deployment VPS tidak bentrok dengan port host `5432` atau `6379`.
- Memperbaiki smart deploy agar perubahan frontend-only tidak menyalakan ulang backend, PostgreSQL, atau Redis.
- Memperbaiki workflow deploy agar menjalankan script dari direktori production server (`/srv/eduflow/app`) sebelum build image.
- Menegaskan Docker build context production selalu `/srv/eduflow/app` atau `EDUFLOW_DEPLOY_PATH`, bukan checkout sementara GitHub runner.
- Memindahkan default log deployment production dari `/srv/eduflow/app/logs/deploy` ke `/srv/eduflow/logs/deploy`.
- Mengubah validasi production agar deploy gagal jika repository memiliki perubahan lokal, bukan melakukan auto-stash.
- Menambahkan summary deployment dan trap error yang menampilkan command, exit code, dan line number.
- Mengubah Docker cleanup menjadi `docker image prune -af --filter "until=72h"`.
- Menambahkan endpoint frontend `GET /api/health` dan mengubah healthcheck frontend agar tidak memakai halaman `/login`.
- Menambahkan retry HTTP healthcheck agar deploy menunggu frontend/backend siap setelah restart container.
- Memperbaiki retry healthcheck agar error `curl` seperti exit code 56 tidak mematikan script sebelum retry berjalan.
