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

## Catatan Teknis

Metrik request disimpan in-memory oleh backend melalui `RequestMetricsService`.
Data ini ringan dan cukup untuk support teknis cepat, tetapi akan reset saat container backend restart.

Untuk kebutuhan multi sekolah yang lebih besar, metrik jangka panjang dapat dipindah ke stack observability khusus seperti Prometheus/Grafana atau log aggregator.
