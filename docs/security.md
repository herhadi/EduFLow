# Security

Dokumen ini merangkum prinsip keamanan awal EduFlow untuk development dan production.

## Secret Dan Environment

- Jangan commit `.env`, `.env.local`, backup, atau log production.
- `JWT_SECRET` production wajib diganti dari nilai contoh.
- Secret backend berada di environment server atau secret manager runner.
- Frontend hanya boleh menerima variable public yang memang aman, seperti `NEXT_PUBLIC_API_URL`.
- `BACKEND_INTERNAL_API_URL` adalah runtime server-side Next.js dan tidak perlu diekspos ke browser.

## Akses Server

- Deployment normal dilakukan melalui GitHub Actions self-hosted runner.
- SSH langsung ke server hanya untuk maintenance atau incident.
- Batasi akses SSH dan dashboard administratif dengan Cloudflare Access atau kontrol setara.
- Jangan melakukan perubahan kode langsung di server production.

## CORS Dan Origin

- Backend membaca `FRONTEND_URL` dan `FRONTEND_ALLOWED_ORIGINS`.
- Production harus mengisi domain frontend resmi.
- Hindari wildcard origin untuk production.

## Database Dan Backup

- PostgreSQL adalah source of truth.
- Backup berisi data sensitif siswa, guru, dan wali murid.
- Simpan backup di lokasi terenkripsi dan batasi aksesnya.
- Jangan kirim backup lewat chat publik.
- Prosedur backup dan restore ada di `docs/backup-recovery.md`.
- Endpoint operasional untuk dashboard health memakai permission laporan, sedangkan backup, restore, dan recovery hanya dapat diakses melalui permission `system.recovery.manage`, yang diberikan khusus kepada role `root`.
- Permission recovery diberikan melalui migration dan seed. Setelah deploy yang menambah permission baru, user harus logout-login agar session browser membawa daftar permission terbaru.

## CI/CD

- Workflow deployment hanya berjalan pada self-hosted runner.
- Deployment memakai lock agar tidak ada dua proses production berjalan bersamaan.
- Log deployment berada di server dan tidak masuk Git.
- Rollback otomatis belum tersedia pada CI/CD v1.

## Akun Aplikasi

- Root awal dibuat oleh Prisma seed dari `ROOT_*`.
- Password default harus diganti saat login pertama.
- Permission harus berbasis permission matrix, bukan hardcode role.
