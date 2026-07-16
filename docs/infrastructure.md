# Infrastruktur

Dokumen ini menjelaskan infrastruktur production EduFlow di server Debian.

## Komponen Production

- Debian server sebagai host utama.
- Docker Compose untuk menjalankan service aplikasi.
- GitHub self-hosted runner untuk CI/CD.
- Cloudflare Tunnel untuk publikasi frontend.
- Cloudflare Access untuk akses administratif yang perlu dibatasi.
- PostgreSQL sebagai database utama.
- Redis untuk BullMQ, cache, scheduler support, dan state sementara.

## Service Docker

```text
frontend
  -> Next.js app
  -> menerima traffic browser
  -> proxy /api/backend ke backend internal

backend
  -> NestJS API
  -> worker BullMQ
  -> Prisma Client

postgres
  -> database EduFlow

redis
  -> queue, cache, temporary state
```

`postgres` dan `redis` tidak publish port ke host pada compose utama. Akses antar service memakai Docker network internal. Development lokal yang perlu port `5432` dan `6379` memakai `docker-compose.local.yml`.

## Domain

| Service | Contoh URL |
| --- | --- |
| Frontend | `https://eduflow.tripleatech.my.id` |
| SSH | `ssh.tripleatech.my.id` |
| PostgreSQL private | `postgres.tripleatech.my.id` |

Domain dapat diganti sesuai server sekolah. Jika domain berubah, sesuaikan `FRONTEND_URL`, `FRONTEND_ALLOWED_ORIGINS`, dan konfigurasi Cloudflare Tunnel.

## Struktur Operasional Repository

Repository production default berada di:

```text
/srv/eduflow/app
```

Jika path berbeda, ubah `EDUFLOW_DEPLOY_PATH` di `.github/workflows/deploy.yml`.

Docker build context production wajib memakai repository production tersebut. Checkout sementara GitHub runner (`$GITHUB_WORKSPACE`) hanya dipakai oleh GitHub Actions untuk membaca workflow, bukan sebagai sumber image Docker.

```text
.github/workflows/deploy.yml
scripts/deploy.sh
scripts/healthcheck.sh
scripts/lib/log.sh
scripts/lib/docker.sh
scripts/lib/common.sh
docker-compose.yml
apps/backend/Dockerfile
apps/frontend/Dockerfile
```

## Environment Production

Pola satu stack Docker/VPS:

```env
NEXT_PUBLIC_API_URL=/api/backend
BACKEND_INTERNAL_API_URL=http://backend:3001/api
DATABASE_URL=postgresql://eduflow:eduflow@postgres:5432/eduflow?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=ganti-dengan-secret-production
FRONTEND_URL=https://domain-production
FRONTEND_ALLOWED_ORIGINS=https://domain-production
```

Docker Compose membaca `apps/backend/.env` sebagai `env_file` untuk secret backend. Variabel koneksi yang sensitif terhadap network container tetap dioverride oleh blok `environment` compose agar production tidak memakai `localhost`.

`NEXT_PUBLIC_API_URL` dipakai saat build image frontend. Jika nilainya berubah, image frontend wajib dibuild ulang.

## Security Production

### Secret Dan Environment

- Jangan commit `.env`, `.env.local`, backup, atau log production.
- `JWT_SECRET` production wajib diganti dari nilai contoh.
- Secret backend berada di environment server atau secret manager runner.
- Frontend hanya boleh menerima variable public yang memang aman, seperti `NEXT_PUBLIC_API_URL`.
- `BACKEND_INTERNAL_API_URL` adalah runtime server-side Next.js dan tidak perlu diekspos ke browser.

### Akses Server

- Deployment normal dilakukan melalui GitHub Actions self-hosted runner.
- SSH langsung ke server hanya untuk maintenance atau incident.
- Batasi akses SSH dan dashboard administratif dengan Cloudflare Access atau kontrol setara.
- Jangan melakukan perubahan kode langsung di server production.

### CORS Dan Origin

- Backend membaca `FRONTEND_URL` dan `FRONTEND_ALLOWED_ORIGINS`.
- Production harus mengisi domain frontend resmi.
- Hindari wildcard origin untuk production.

### Database, Backup, Dan CI/CD

- PostgreSQL adalah source of truth.
- Backup berisi data sensitif siswa, guru, dan wali murid; simpan di lokasi terenkripsi dan batasi aksesnya.
- Prosedur backup dan restore ada di `docs/backup-recovery.md`.
- Workflow deployment hanya berjalan pada self-hosted runner dan memakai lock agar tidak ada dua proses production berjalan bersamaan.
- Log deployment berada di server dan tidak masuk Git.
- Deployment menjalankan build, migration sesuai perubahan, restart service terkait, dan health check.

### Akun Aplikasi

- Root awal dibuat oleh Prisma seed dari `ROOT_*`.
- Password default harus diganti saat login pertama.
- Permission harus berbasis permission matrix, bukan hardcode role.
- Endpoint operasional untuk dashboard health, backup, restore, queue recovery, dan monitoring root ops memakai permission `system.recovery.manage`, yang diberikan khusus kepada role `root`.
- Permission recovery diberikan melalui migration dan seed. Setelah deploy yang menambah permission baru, user harus logout-login agar session browser membawa daftar permission terbaru.

## Log Operasional

Script deployment menulis log ke:

```text
/srv/eduflow/logs/deploy/
```

Path ini berada di luar repository production `/srv/eduflow/app`. Jika path server berbeda, set GitHub Actions repository variable `EDUFLOW_LOG_DIR` atau environment `DEPLOY_LOG_DIR`.

## Root Ops

Halaman operasional root memakai endpoint `GET /api/operations/dashboard`.

Informasi utama:

- Ringkasan runtime paling atas: CPU load, RAM server, RAM backend, request/menit, error/menit, dan uptime.
- Health service: database, Redis, queue, worker, notification, dan storage R2.
- Runtime backend: uptime proses, CPU load, RAM server, dan RAM proses backend.
- Traffic API: request per menit, error per menit, rata-rata durasi request, dan jumlah request pada window 5 menit.
- Queue: waiting, active, failed, delayed, dan completed untuk reminder guru, attendance summary, notification send, dan report daily.
- Failed job: daftar job gagal terbaru, payload, retry, dan discard.
- Storage: jumlah file dan ukuran bucket R2 bila kredensial Cloudflare tersedia.

Metrik request disimpan in-memory oleh backend melalui `RequestMetricsService`. Data ini ringan dan cukup untuk support teknis cepat, tetapi akan reset saat container backend restart. Untuk kebutuhan multi sekolah yang lebih besar, metrik jangka panjang dapat dipindah ke stack observability khusus seperti Prometheus/Grafana atau log aggregator.

### Warna Status

Health card memakai warna untuk membedakan tingkat masalah:

- Biru: ringkasan runtime netral yang perlu cepat dibaca root.
- Hijau: layanan berjalan normal dan data pendukung berhasil dibaca.
- Kuning: layanan utama aktif, tetapi detail pendukung belum lengkap atau belum bisa dibaca.
- Merah: layanan gagal, tidak terhubung, atau perlu tindakan teknis.

Contoh status kuning adalah Cloudflare R2 yang masih bisa dipakai upload dan preview file, tetapi dashboard belum bisa menampilkan jumlah file atau ukuran bucket karena credential belum memiliki izin `ListBucket` atau akses Cloudflare Analytics.

### Cloudflare R2 Storage

Upload dan preview file R2 memakai operasi object seperti `PutObject` dan `GetObject`. Detail penggunaan storage memakai operasi berbeda:

- Cloudflare GraphQL Analytics jika `CLOUDFLARE_API_TOKEN` tersedia dan memiliki izin yang sesuai.
- Fallback listing object S3-compatible jika credential R2 memiliki izin membaca daftar object bucket.

Jika upload dan preview R2 masih berjalan tetapi jumlah file atau ukuran bucket tidak bisa dibaca, dashboard memakai status warning karena layanan storage aktif tetapi detail usage belum tersedia. Status `Unhealthy` dipakai untuk gangguan yang membuat storage tidak dapat digunakan atau konfigurasi dasar tidak lengkap. Credential tidak pernah ditampilkan di UI. Kapasitas atau limit akun R2 tidak tersedia melalui API S3-compatible dan perlu dilihat dari dashboard Cloudflare.

Checklist saat R2 kuning:

- Pastikan upload dan preview file masih berhasil dari fitur profil atau perangkat ajar.
- Pastikan `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `R2_BUCKET_NAME` terbaca di container backend.
- Jika ingin melihat jumlah file dan ukuran bucket dari EduFlow, berikan izin list bucket pada credential R2 atau lengkapi token Cloudflare Analytics.
- Jika hanya upload/preview yang dibutuhkan saat pilot, status kuning dapat dicatat sebagai keterbatasan monitoring, bukan gangguan layanan.

## Batas Tanggung Jawab

- Infrastructure menjalankan service dan menyediakan konektivitas.
- Domain logic tetap berada di modul backend.
- Backup dan restore mengikuti `docs/backup-recovery.md`.
- Deployment mengikuti `docs/deployment.md`.
