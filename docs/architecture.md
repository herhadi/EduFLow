# EduFlow Architecture

## Application Shape

EduFlow starts as a modular monolith with two deployable applications:

- `frontend`: Next.js App Router interface.
- `backend`: NestJS API and background job host.

PostgreSQL is the source of truth. Redis supports cache, rate limiting, scheduler state, and BullMQ queues.

## Backend Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Authentication, refresh tokens, and permission-based RBAC |
| `academic` | Students, teachers, classes, subjects, academic years, semesters, schedules |
| `attendance` | Daily agendas, teaching activity, student attendance, class status |
| `notification` | WhatsApp, Telegram, email, reminders, summaries |
| `reporting` | Dashboards, statistics, recaps, principal reports |
| `scheduler` | Centralized scheduled automation |
| `audit` | Important entity mutation history |

Finance belongs in a future `finance` module when the core academic workflow is stable.

## Academic Workflow

```text
Schedule template
  -> generate DailyAgenda for a date
  -> record teaching activity and StudentAttendance
  -> publish domain events
  -> process notifications and reports asynchronously
```

Attendance must reference `DailyAgenda`, never `Schedule` directly. This keeps substitutions, holidays, examinations, and special activities manageable.

## Internal Events

Initial event names live beside their owning domains:

- `apps/backend/src/modules/attendance/events/attendance.events.ts`
- `apps/backend/src/modules/academic/events/teacher.events.ts`

Large workflows should publish events rather than call notification providers directly.

## Shared Layers

Reusable code should be promoted only when it serves multiple call sites:

- Backend cross-module decorators, guards, logging, and truly shared helpers belong in `apps/backend/src/common`.
- Domain events stay beside their owning modules to prevent global event chaos.
- Frontend UI primitives belong in `apps/frontend/components/ui`.
- Frontend framework-agnostic helpers belong in `apps/frontend/lib`.
- Global Tailwind theme tokens and base styles belong in `apps/frontend/app/globals.css`.
- Cross-application types, constants, and utilities belong in `packages`.

Domain-specific logic stays inside the owning module to avoid an unstructured shared folder.

## Authentication And Authorization

Authentication uses short-lived JWT access tokens and rotating opaque refresh tokens. Refresh token hashes are stored in PostgreSQL and can be revoked.

The API applies authentication and permission guards globally. Public endpoints must opt out explicitly with `@Public()`. Endpoints that require capabilities use `@RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)`, avoiding hardcoded role checks and scattered permission strings.

## Implementation Order

1. Authentication and permission-based RBAC.
2. Academic master data and schedule management.
3. Daily agenda generation through the centralized scheduler.
4. Teaching activity and student attendance.
5. Queue-backed notification delivery.
6. Reporting dashboards and school summaries.
