# Operations

Root Ops menampilkan status Cloudflare R2 melalui Cloudflare GraphQL Analytics bila `CLOUDFLARE_API_TOKEN` tersedia, lalu fallback ke listing object bucket. Tampilan memuat nama bucket, jumlah file, dan ukuran total file. Status `Unhealthy` berarti konfigurasi R2 belum lengkap atau token tidak dapat membuat daftar object; credential tidak pernah ditampilkan di UI. Kapasitas atau limit akun R2 tidak tersedia melalui API S3-compatible dan perlu dilihat dari dashboard Cloudflare.
