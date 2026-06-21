# Infrastruktur

Dokumen ini menjelaskan infrastruktur production EduFlow di server Debian.

## Komponen Production

- Debian server sebagai host utama.
- Docker Compose untuk menjalankan service aplikasi.
- GitHub self-hosted runner untuk CI/CD.
- Cloudflare Tunnel untuk publikasi frontend.
- Cloudflare Access untuk akses administratif yang perlu dibatasi.
- PostgreSQL sebagai database utama.
- Redis untuk BullMQ, cache, scheduler support, dan state sementara.

## Service Docker

```text
frontend
  -> Next.js app
  -> menerima traffic browser
  -> proxy /api/backend ke backend internal

backend
  -> NestJS API
  -> worker BullMQ
  -> Prisma Client

postgres
  -> database EduFlow

redis
  -> queue, cache, temporary state
```

`postgres` dan `redis` tidak publish port ke host pada compose utama. Akses antar service memakai Docker network internal. Development lokal yang perlu port `5432` dan `6379` memakai `docker-compose.local.yml`.

## Domain

| Service | Contoh URL |
| --- | --- |
| Frontend | `https://eduflow.tripleatech.my.id` |
| SSH | `ssh.tripleatech.my.id` |
| PostgreSQL private | `postgres.tripleatech.my.id` |

Domain dapat diganti sesuai server sekolah. Jika domain berubah, sesuaikan `FRONTEND_URL`, `FRONTEND_ALLOWED_ORIGINS`, dan konfigurasi Cloudflare Tunnel.

## Struktur Operasional Repository

```text
.github/workflows/deploy.yml
scripts/deploy.sh
scripts/healthcheck.sh
scripts/lib/log.sh
scripts/lib/docker.sh
scripts/lib/common.sh
docker-compose.yml
apps/backend/Dockerfile
apps/frontend/Dockerfile
```

## Environment Production

Pola satu stack Docker/VPS:

```env
NEXT_PUBLIC_API_URL=/api/backend
BACKEND_INTERNAL_API_URL=http://backend:3001/api
DATABASE_URL=postgresql://eduflow:eduflow@postgres:5432/eduflow?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=ganti-dengan-secret-production
FRONTEND_URL=https://domain-production
FRONTEND_ALLOWED_ORIGINS=https://domain-production
```

`NEXT_PUBLIC_API_URL` dipakai saat build image frontend. Jika nilainya berubah, image frontend wajib dibuild ulang.

## Log Operasional

Script deployment menulis log ke:

```text
logs/deploy/
```

Folder `logs/` tidak dicommit ke Git.

## Batas Tanggung Jawab

- Infrastructure menjalankan service dan menyediakan konektivitas.
- Domain logic tetap berada di modul backend.
- Backup dan restore mengikuti `docs/backup-recovery.md`.
- Deployment mengikuti `docs/deployment.md`.
