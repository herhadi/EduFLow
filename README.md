# EduFlow

Sistem monitoring kegiatan belajar mengajar sekolah berbasis modular monolith.

EduFlow mengelola jadwal akademik, agenda harian, presensi, monitoring guru, notifikasi, audit trail, reporting, dan workflow operasional sekolah.

## Struktur

- `apps/backend`: API NestJS, worker, Prisma, dan modul domain.
- `apps/frontend`: antarmuka Next.js App Router.
- `packages/shared`: tipe, helper, dan konstanta lintas aplikasi.
- `docs`: keputusan arsitektur dan panduan teknis.
- `scripts`: script operasional deployment dan health check.
- `.github/workflows`: workflow GitHub Actions.
- `docker-compose.yml`: stack Docker untuk frontend, backend, PostgreSQL, dan Redis.

## Pengembangan Lokal

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres redis
npm install
XDG_CACHE_HOME=/tmp/eduflow-cache npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

Frontend lokal berjalan di `http://localhost:3000`, backend di `http://localhost:3001`.

Untuk frontend proxy lokal:

```env
NEXT_PUBLIC_API_URL=/api/backend
BACKEND_INTERNAL_API_URL=http://localhost:3001/api
```

## Alur Akademik Utama

```text
Schedule -> Generate Daily Agenda -> Attendance & Activity
```

Presensi wajib mengacu pada agenda harian, bukan langsung pada jadwal tetap.

## Deployment Docker/VPS

Pola satu stack Docker/VPS menggunakan frontend sebagai pintu masuk browser dan proxy Next.js `/api/backend` ke backend internal Docker.

```env
NEXT_PUBLIC_API_URL=/api/backend
BACKEND_INTERNAL_API_URL=http://backend:3001/api
```

Urutan awal server baru:

```bash
docker compose up -d postgres redis
docker compose run --rm backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
docker compose run --rm backend npm run prisma:seed --workspace backend
docker compose up -d backend frontend
```

Detail production ada di `docs/deployment.md` dan `docs/infrastructure.md`.

## CI/CD

CI/CD v1 memakai GitHub Actions self-hosted runner:

- workflow: `.github/workflows/deploy.yml`
- script utama: `scripts/deploy.sh`
- health check: `scripts/healthcheck.sh`
- log deployment production: `/srv/eduflow/logs/deploy/`

Manual deployment di server:

```bash
./scripts/deploy.sh
```

## Aturan Struktur

- Simpan runtime concern backend di `apps/backend/src/common`: guard, decorator, interceptor, dan exception.
- Simpan abstraksi dasar backend di `apps/backend/src/core`: base entity, pagination, response, dan domain utility.
- Simpan kode lintas aplikasi di `packages/shared`: tipe, helper, dan konstanta.
- Simpan event di dalam domain pemiliknya.
- Daftarkan queue secara terpusat di `apps/backend/src/queue`.
- Pastikan scheduler hanya membuat job dan worker berada di `apps/backend/src/workers`.
- Simpan integrasi pihak ketiga di `apps/backend/src/infrastructure`.
- Simpan komponen frontend reusable di `apps/frontend/components/ui`.
- Simpan token Tailwind dan gaya dasar di `apps/frontend/app/globals.css`.

## Dokumentasi

- `docs/architecture.md`: arsitektur aplikasi dan batas modul.
- `docs/deployment.md`: deployment lokal, Docker/VPS, dan CI/CD.
- `docs/infrastructure.md`: server production, Docker service, runner, dan Cloudflare.
- `docs/security.md`: secret, akses server, CORS, backup, dan CI/CD security.
- `docs/backup-recovery.md`: backup dan restore PostgreSQL/Redis.
- `infra/backup/export-postgres-without-root.sh`: export data untuk demo tanpa akun root sumber.
- `infra/backup/import-postgres-without-root.sh`: import destruktif ke server lalu membuat root dari environment target.
- `docs/workflow.md`: alur kerja utama dan referensi dokumen domain.
- `docs/changelog.md`: catatan perubahan operasional penting.

## Endpoint Auth Awal

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Semua endpoint backend terlindungi secara global kecuali ditandai dengan decorator `@Public()`.
