# EduFlow

School academic monitoring system built as a modular monolith.

## Structure

- `apps/backend`: NestJS API, domain modules, Prisma schema, BullMQ-ready infrastructure.
- `apps/frontend`: Next.js App Router frontend.
- `docker-compose.yml`: Local PostgreSQL and Redis services.

## Getting Started

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

## Domain Flow

```text
Schedule -> Daily Agenda -> Attendance
```

Notifications and asynchronous workflows should be triggered through internal events and processed in queues.

## Shared Conventions

- Place backend cross-module helpers in `apps/backend/src/common`.
- Keep domain-specific logic inside its owning backend module.
- Place reusable frontend components in `apps/frontend/components/ui`.
- Place reusable frontend helpers in `apps/frontend/lib`.
- Define global Tailwind tokens and base styles in `apps/frontend/app/globals.css`.

## Initial Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Backend endpoints are protected globally unless marked with the shared `@Public()` decorator.
