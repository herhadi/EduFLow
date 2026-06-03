# Infra

Folder ini berisi konfigurasi infrastruktur lokal dan deployment-adjacent.

Bedakan dengan `apps/backend/src/infrastructure`:

- `infra/`: konfigurasi service eksternal seperti PostgreSQL dan Redis.
- `apps/backend/src/infrastructure`: adapter kode NestJS untuk provider eksternal.

## Local Services

Service lokal didefinisikan di `docker-compose.yml`.

- PostgreSQL: database utama EduFlow.
- Redis: BullMQ, cache, rate limit, scheduler state, dan temporary state.

## Struktur

```text
infra/
  postgres/
    init/
      001_extensions.sql
  redis/
    redis.conf
```

## Catatan

- Data permanen tetap berada di volume Docker `postgres_data`.
- Redis bukan source of truth.
- File init PostgreSQL hanya berjalan saat volume database pertama kali dibuat.

