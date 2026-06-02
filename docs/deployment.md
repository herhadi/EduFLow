# Deployment

## Local Development

```bash
cp .env.example .env
docker compose up -d
npm install
XDG_CACHE_HOME=/tmp/eduflow-cache npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

## Services

- Frontend: Next.js application.
- Backend: NestJS API and worker host.
- PostgreSQL: permanent data store.
- Redis: BullMQ, cache, and temporary state.

Production deployment should provide environment variables securely and run Prisma migrations before starting the backend.

