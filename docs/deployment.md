# Deployment

## Pengembangan Lokal

```bash
cp .env.example .env
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

Deployment production wajib menyediakan environment variable secara aman dan menjalankan migration Prisma sebelum backend dimulai.

