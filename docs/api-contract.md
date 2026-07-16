# API Contract

Dokumen ini menjadi acuan format response JSON backend EduFlow.

## Format Standar

Semua endpoint JSON internal aplikasi menggunakan format:

```json
{
  "data": {},
  "message": "Opsional",
  "meta": {}
}
```

- `data` wajib ada, termasuk untuk aksi tanpa payload. Gunakan `null`.
- `message` opsional, dipakai terutama untuk aksi `POST`, `PATCH`, atau `DELETE`.
- `meta` opsional, dipakai untuk pagination, ringkasan, atau informasi pendukung yang bukan data utama.

## Contoh

List data:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

Aksi berhasil tanpa payload:

```json
{
  "data": null,
  "message": "Password berhasil diganti."
}
```

## Exception

Beberapa endpoint boleh tidak memakai format standar:

- `POST /auth/login` dan `POST /auth/refresh`, untuk menjaga kontrak autentikasi lama.
- `POST /auth/telegram/webhook`, karena Telegram hanya membutuhkan response ringan.
- `GET /health/*`, karena dipakai sebagai health check teknis.
- Endpoint download/export/backup stream yang memakai `@Res()` dan mengirim file langsung.

## Error Response

Error response ditangani oleh global error filter. Endpoint tidak perlu membungkus error manual dalam `data`.

Format error JSON:

```json
{
  "statusCode": 400,
  "message": "Payload tidak valid",
  "error": "Bad Request",
  "correlationId": "uuid",
  "path": "/api/example",
  "method": "POST",
  "timestamp": "2026-07-16T00:00:00.000Z"
}
```

- `message` dapat berupa string atau array string untuk error validasi.
- `correlationId` juga dikirim melalui header `x-correlation-id`.
- Error internal `500` mengembalikan `Internal server error` ke client, sementara detail teknis hanya dicatat di log backend.

## Catatan Implementasi

Backend menyediakan helper `ok(data, message?, meta?)` di `apps/backend/src/core/response/api-response.ts`.
Gunakan helper ini untuk endpoint baru atau saat merapikan endpoint lama.

Pada fase freeze piloting, standardisasi dilakukan bertahap per modul agar tidak mengubah kontrak besar sekaligus. Hindari interceptor pembungkus global sampai exception seperti login, webhook, health check, dan file stream benar-benar aman.

## Role Operasional

Endpoint operasional sekolah tidak otomatis memberi akses kepada `root`. Role `root` dipakai untuk support teknis, recovery, audit, dan konfigurasi sistem. Workflow harian seperti review izin/sakit siswa memakai `operator_sekolah` dan wali kelas sesuai cakupan datanya.
