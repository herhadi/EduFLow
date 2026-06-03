# PostgreSQL Infra

PostgreSQL adalah source of truth EduFlow.

## Local Defaults

- Database: `eduflow`
- User: `eduflow`
- Password: `eduflow`
- Port: `5432`

## Init Scripts

File di `infra/postgres/init` di-mount ke `/docker-entrypoint-initdb.d`.

Script init hanya berjalan saat volume PostgreSQL masih kosong.

