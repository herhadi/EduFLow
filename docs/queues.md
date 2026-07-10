# Queue Strategy: Job Naming Dan Retry

BullMQ digunakan untuk proses asynchronous, proses berat, dan workflow yang tidak boleh menghambat response HTTP.

## Konvensi Nama Queue

Gunakan format:

```text
domain:action
```

BullMQ tidak mengizinkan karakter `:` pada nama queue. Karena itu nama queue memakai format:

```text
domain-action
```

Queue awal:

| Queue | Fungsi |
| --- | --- |
| `notification-send` | Pengiriman WhatsApp, Telegram, dan email |
| `attendance-summary` | Summary presensi dan agenda |
| `teacher-reminder` | Reminder guru dan deteksi guru terlambat |
| `report-daily` | Laporan harian kepala sekolah |

## Konvensi Nama Job

Gunakan format:

```text
domain:action:detail
```

Job awal:

| Job | Queue | Fungsi |
| --- | --- | --- |
| `notification:send:whatsapp` | `notification-send` | Mengirim pesan WhatsApp |
| `notification:send:telegram` | `notification-send` | Mengirim pesan Telegram |
| `notification:send:email` | `notification-send` | Mengirim email |
| `attendance:generate-agenda` | `attendance-summary` | Generate agenda harian dari jadwal |
| `attendance:summary:daily` | `attendance-summary` | Membuat summary harian |
| `teacher:reminder:before-class` | `teacher-reminder` | Reminder guru sebelum jam mengajar |
| `teacher:detect:absent` | `teacher-reminder` | Deteksi guru tidak hadir |
| `report:daily:principal` | `report-daily` | Laporan harian kepala sekolah |

## Default Retry Policy

| Jenis Job | Attempts | Backoff | Catatan |
| --- | ---: | --- | --- |
| Notifikasi WhatsApp/Telegram/email | 5 | exponential, 30 detik | Provider eksternal bisa lambat atau gagal sementara |
| Reminder guru | 3 | fixed, 15 detik | Harus cepat, tetapi tidak boleh spam |
| Generate agenda | 3 | exponential, 10 detik | Idempotent wajib |
| Summary harian | 3 | exponential, 30 detik | Bisa diproses ulang |
| Report harian | 2 | fixed, 60 detik | Lebih aman dijalankan ulang manual jika gagal |

## Default Job Options

```ts
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 30000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
  },
};
```

## Idempotency

Job wajib aman dijalankan ulang.

Contoh aturan:

- Generate agenda memakai unique key `scheduleId + date`.
- Kirim notifikasi memakai `dedupeKey` seperti `notificationType + recipient + entityId`.
- Summary harian memakai `date + classId + schoolYearId`.
- Report harian memakai `date + reportType`.

## Payload Job

Payload job sebaiknya hanya membawa identifier:

```ts
type QueuePayload = {
  correlationId?: string;
  actorUserId?: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};
```

Worker mengambil data terbaru dari PostgreSQL. Jangan membawa object besar dalam payload job.

## Pengiriman Telegram

Job `notification:send:telegram` membaca `NotificationLog` terbaru dari PostgreSQL lalu mengirim pesan melalui Telegram Bot API. Worker membutuhkan `TELEGRAM_BOT_TOKEN`; jika token kosong, Telegram API gagal, atau chat tujuan tidak valid, status log diubah menjadi `FAILED` dan error disimpan di `NotificationLog.lastError` agar bisa diretry dari panel notifikasi.

Aktivasi chat Telegram user dilakukan dari halaman Profil. Backend membuat token aktivasi, bot menerima `/start <token>` melalui webhook `POST /api/auth/telegram/webhook`, lalu menyimpan `User.telegramId`. Setelah itu notifikasi Telegram memakai `User.telegramId` sebagai recipient.

## Batas Tanggung Jawab

- Scheduler membuat job terjadwal atau delayed.
- Queue module mendaftarkan queue dan konfigurasi umum.
- Worker memproses job.
- Infrastructure adapter menghubungi provider pihak ketiga.
- Domain service menerbitkan event, bukan mengirim notifikasi langsung.

## Dead Letter Dan Monitoring

Untuk MVP:

- simpan failed job di BullMQ selama 7 hari,
- expose dashboard atau endpoint monitoring setelah core workflow stabil,
- log error dengan `correlationId`,
- retry manual hanya untuk job yang idempotent.
