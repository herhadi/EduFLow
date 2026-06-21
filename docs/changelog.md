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
