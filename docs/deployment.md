# Deployment

Dokumen terkait:

- Infrastruktur production: `docs/infrastructure.md`
- Security production: `docs/security.md`
- Backup dan restore: `docs/backup-recovery.md`
- Changelog operasional: `docs/changelog.md`

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

Setelah reset volume atau deploy database baru, tunggu PostgreSQL siap sebelum menjalankan migration. Status `Started` pada Docker belum berarti database sudah menerima koneksi.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres redis
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

## Docker Compose Pola 1

Pola satu stack Docker/VPS menggunakan service `frontend` sebagai pintu masuk browser dan route proxy Next.js `/api/backend` untuk meneruskan request ke service `backend` di network Docker.

Compose utama tidak mengekspos port PostgreSQL dan Redis ke host agar aman untuk VPS dan tidak bentrok dengan service host. Untuk development lokal yang menjalankan backend di luar container, gunakan `docker-compose.local.yml`.

Environment minimal:

```env
NEXT_PUBLIC_API_URL=/api/backend
BACKEND_INTERNAL_API_URL=http://backend:3001/api
DATABASE_URL=postgresql://eduflow:eduflow@postgres:5432/eduflow?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=ganti-dengan-secret-production
FRONTEND_URL=https://domain-frontend-atau-ip-server
FRONTEND_ALLOWED_ORIGINS=https://domain-frontend-atau-ip-server
```

`NEXT_PUBLIC_API_URL` masuk ke bundle frontend saat image dibuild. Jika nilainya berubah, rebuild image frontend:

```bash
docker compose build frontend
docker compose up -d
```

Urutan deploy database baru:

```bash
docker compose up -d postgres redis
until docker compose exec -T postgres pg_isready -U eduflow -d eduflow; do sleep 2; done
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npm run prisma:seed --workspace backend
docker compose up -d backend frontend
```

## CI/CD V1

Deployment production dijalankan oleh GitHub Actions self-hosted runner melalui:

```text
.github/workflows/deploy.yml
```

Workflow melakukan checkout untuk membaca workflow dan script terbaru, lalu menjalankan script dari checkout tersebut dengan target direktori production:

```bash
EDUFLOW_ROOT="${EDUFLOW_DEPLOY_PATH:-/srv/eduflow/app}" \
bash "$GITHUB_WORKSPACE/scripts/deploy.sh"
```

Direktori production default adalah `/srv/eduflow/app`. Jika path server berbeda, set GitHub Actions repository variable `EDUFLOW_DEPLOY_PATH`.

Mode ini membuat bootstrap CI/CD aman: meskipun direktori production belum memiliki folder `scripts/`, workflow tetap memakai script dari checkout GitHub. Namun semua operasi source production dan Docker tetap berjalan dari `EDUFLOW_ROOT`.

Docker wajib selalu build dari:

```text
/srv/eduflow/app
```

atau dari path yang diset melalui `EDUFLOW_DEPLOY_PATH`. Docker tidak boleh build dari `$GITHUB_WORKSPACE`, karena folder itu hanya checkout sementara milik runner.

Script deployment melakukan:

- lock deployment agar tidak ada dua proses bersamaan,
- `git fetch` dan sinkronisasi worktree production ke `origin/main`,
- menyimpan perubahan lokal server ke stash dan commit lokal ke branch `deploy-backup/...` sebelum reset ke GitHub,
- deteksi perubahan berbasis Git diff,
- build image `frontend` dan/atau `backend` sesuai perubahan,
- restart hanya service aplikasi yang berubah dengan `docker compose up -d --no-deps`,
- melewati persiapan PostgreSQL/Redis untuk perubahan frontend-only,
- menjalankan `npx prisma migrate deploy` ketika schema atau migration berubah,
- health check container dan HTTP,
- cleanup image Docker tidak terpakai,
- logging ke `logs/deploy/`.
- menampilkan 200 baris terakhir log deployment di GitHub Actions jika deploy gagal.

Variabel opsional:

```env
DEPLOY_BUILD_ALL=1
DEPLOY_RUN_MIGRATION=1
DEPLOY_RUN_SEED=1
FRONTEND_HEALTH_URL=http://localhost:3000/login
BACKEND_HEALTH_URL=http://localhost:3001/health
```

Untuk server Debian dengan Cloudflare Tunnel, `FRONTEND_HEALTH_URL` dapat diarahkan ke domain public jika tunnel sudah stabil. Untuk validasi internal server, gunakan default localhost.
