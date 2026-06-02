# Database

PostgreSQL is EduFlow's source of truth. Redis stores only queue, cache, rate-limit, scheduler, and temporary state.

## Core Rules

- Use UUID identifiers for primary entities.
- Use soft deletes for important entities.
- Keep academic records scoped by school year and semester.
- Store important mutations in `AuditLog`.
- Apply schema changes through Prisma migrations.

## Academic Relationship

`Schedule` is a reusable template. `DailyAgenda` is its dated realization. `StudentAttendance` references `DailyAgenda`, never `Schedule`.

## Authentication

Passwords are bcrypt hashes. Refresh tokens are opaque values; only SHA-256 token hashes are stored in PostgreSQL.

