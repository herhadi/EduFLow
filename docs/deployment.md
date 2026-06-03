# Deployment

## Pengembangan Lokal

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
docker compose up -d
npm install
XDG_CACHE_HOME=/tmp/eduflow-cache npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

## Service

- Frontend: aplikasi Next.js.
- Backend: API NestJS dan host worker.
- PostgreSQL: penyimpanan data permanen.
- Redis: BullMQ, cache, dan state sementara.

Konfigurasi service lokal berada di `infra/`.

Deployment production wajib menyediakan environment variable secara aman dan menjalankan migration Prisma sebelum backend dimulai.

## Environment Variable

- Backend NestJS memakai `apps/backend/.env`.
- Frontend Next.js memakai `apps/frontend/.env.local`.
- Root `.env` tidak dipakai untuk runtime aplikasi agar konfigurasi backend dan frontend tidak tercampur.
