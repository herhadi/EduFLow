# EduFlow

Sistem monitoring kegiatan belajar mengajar sekolah berbasis modular monolith.

## Struktur

- `apps/backend`: API NestJS, worker, Prisma, dan modul domain.
- `apps/frontend`: antarmuka Next.js App Router.
- `packages/shared`: tipe, helper, dan konstanta lintas aplikasi.
- `docs`: keputusan arsitektur dan panduan teknis.
- `docker-compose.yml`: PostgreSQL dan Redis untuk pengembangan lokal.

## Menjalankan Project

```bash
cp .env.example .env
docker compose up -d
npm install
XDG_CACHE_HOME=/tmp/eduflow-cache npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

## Alur Akademik Utama

```text
Schedule -> Generate Daily Agenda -> Attendance & Activity
```

Presensi wajib mengacu pada agenda harian, bukan langsung pada jadwal tetap.

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

## Endpoint Auth Awal

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Semua endpoint backend terlindungi secara global kecuali ditandai dengan decorator `@Public()`.

