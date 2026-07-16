# Operations

Panduan ini mencatat fitur operasional untuk role root sebagai support teknis EduFlow.

## Root Monitoring

Halaman operasional root memakai endpoint `GET /api/operations/dashboard`.

Informasi utama:

- Health service: database, Redis, queue, worker, notification, dan storage R2.
- Runtime backend: uptime proses, CPU load, RAM server, dan RAM proses backend.
- Traffic API: request per menit, error per menit, rata-rata durasi request, dan jumlah request pada window 5 menit.
- Queue: waiting, active, failed, delayed, dan completed untuk reminder guru, attendance summary, notification send, dan report daily.
- Failed job: daftar job gagal terbaru, payload, retry, dan discard.
- Storage: jumlah file dan ukuran bucket R2 bila kredensial Cloudflare tersedia.

## Warna Status

Health card memakai warna untuk membedakan tingkat masalah:

- Hijau: layanan berjalan normal dan data pendukung berhasil dibaca.
- Kuning: layanan utama aktif, tetapi detail pendukung belum lengkap atau belum bisa dibaca.
- Merah: layanan gagal, tidak terhubung, atau perlu tindakan teknis.

Contoh status kuning adalah Cloudflare R2 yang masih bisa dipakai upload dan preview file, tetapi dashboard belum bisa menampilkan jumlah file atau ukuran bucket karena credential belum memiliki izin `ListBucket` atau akses Cloudflare Analytics.

## Cloudflare R2 Storage

Upload dan preview file R2 memakai operasi object seperti `PutObject` dan `GetObject`. Detail penggunaan storage memakai operasi berbeda:

- Cloudflare GraphQL Analytics jika `CLOUDFLARE_API_TOKEN` tersedia dan memiliki izin yang sesuai.
- Fallback listing object S3-compatible jika credential R2 memiliki izin membaca daftar object bucket.

Karena itu, R2 dapat tetap aktif untuk upload/preview walaupun detail usage belum tersedia. Pada kondisi ini dashboard menampilkan status kuning, bukan merah.

Checklist saat R2 kuning:

- Pastikan upload dan preview file masih berhasil dari fitur profil atau perangkat ajar.
- Pastikan `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `R2_BUCKET_NAME` terbaca di container backend.
- Jika ingin melihat jumlah file dan ukuran bucket dari EduFlow, berikan izin list bucket pada credential R2 atau lengkapi token Cloudflare Analytics.
- Jika hanya upload/preview yang dibutuhkan saat pilot, status kuning dapat dicatat sebagai keterbatasan monitoring, bukan gangguan layanan.

## Catatan Teknis

Metrik request disimpan in-memory oleh backend melalui `RequestMetricsService`.
Data ini ringan dan cukup untuk support teknis cepat, tetapi akan reset saat container backend restart.

Untuk kebutuhan multi sekolah yang lebih besar, metrik jangka panjang dapat dipindah ke stack observability khusus seperti Prometheus/Grafana atau log aggregator.
