# Infrastructure

Simpan adapter pihak ketiga di sini dan kelompokkan berdasarkan provider:

- `redis`
- `queue`
- `whatsapp`
- `telegram`
- `email`
- `storage`

Domain module bergantung pada kontrak adapter, bukan implementasi provider secara langsung.

## Boundary

- Konfigurasi koneksi Redis berada di `redis/`.
- Default option BullMQ berada di `queue/`.
- Domain module tidak membuat koneksi Redis langsung.
- Domain module memakai `QueueProducerService` untuk enqueue job.
- Detail BullMQ tetap berada di `queue/` dan `workers/`.
- Dokumen perangkat ajar disimpan melalui kontrak `StorageProvider`; adapter aktif menggunakan Cloudflare R2 dan bucket privat.
- Domain hanya menyimpan object key serta metadata file. URL unduhan dibuat sementara oleh adapter storage.

## Tidak Masuk Infrastructure

Hal berikut adalah domain logic dan tidak boleh ditempatkan di `infrastructure/`:

- attendance logic,
- auth logic,
- approval flow,
- reporting rule,
- schedule generation.

Jika logic tersebut membutuhkan provider eksternal, domain tetap menyimpan aturan bisnisnya, sedangkan `infrastructure/` hanya menyediakan adapter teknis.
