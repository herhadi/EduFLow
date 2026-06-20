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

Setelah reset volume atau deploy database baru, tunggu PostgreSQL siap sebelum menjalankan migration. Status `Started` pada Docker belum berarti database sudah menerima koneksi.

```bash
docker compose up -d postgres redis
until docker compose exec -T postgres pg_isready -U eduflow -d eduflow; do sleep 2; done
docker compose run --rm backend npx prisma migrate deploy
```

Jika service `backend` dijalankan melalui Compose, pastikan backend baru dimulai setelah migration selesai atau setelah PostgreSQL berstatus healthy.

## Service

- Frontend: aplikasi Next.js.
- Backend: API NestJS dan host worker.
- PostgreSQL: penyimpanan data permanen.
- Redis: BullMQ, cache, dan state sementara.

Konfigurasi service lokal berada di `infra/`.

Deployment production wajib menyediakan environment variable secara aman dan menjalankan migration Prisma sebelum backend dimulai.

## Asset Web Dan PWA

- Logo sekolah utama berada di `apps/frontend/public/logo_sekolah.webp`.
- Icon web dan icon aplikasi/PWA memakai turunan PNG `apps/frontend/public/logo_sekolah.png`.
- Metadata Next.js (`apps/frontend/app/layout.tsx`) dan manifest PWA (`apps/frontend/app/manifest.ts`) wajib menunjuk ke logo sekolah agar favicon, apple icon, dan installable app icon konsisten.
- Jika logo sekolah diganti, buat ulang `logo_sekolah.png` dari sumber logo terbaru dan pastikan ukurannya tetap persegi.

## Environment Variable

- Backend NestJS memakai `apps/backend/.env`.
- Frontend Next.js memakai `apps/frontend/.env.local`.
- Root `.env` tidak dipakai untuk runtime aplikasi agar konfigurasi backend dan frontend tidak tercampur.
- Frontend wajib mengisi `NEXT_PUBLIC_API_URL`; runtime frontend tidak menyediakan fallback ke `localhost:3001` agar production tidak salah target backend.
- Jika frontend memakai proxy `/api/backend`, `BACKEND_INTERNAL_API_URL` juga wajib diisi dan tidak memiliki fallback localhost.
- Pola Docker/VPS satu stack: `NEXT_PUBLIC_API_URL=/api/backend` dan `BACKEND_INTERNAL_API_URL=http://backend:3001/api`.
- Pola frontend dan backend terpisah: `NEXT_PUBLIC_API_URL=https://domain-backend/api`; `BACKEND_INTERNAL_API_URL` tidak diperlukan selama proxy `/api/backend` tidak dipakai.
