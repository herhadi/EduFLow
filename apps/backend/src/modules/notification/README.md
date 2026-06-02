# Notification Module

Subsystem notifikasi dipisahkan menjadi:

- `channels`: kontrak kanal seperti WhatsApp, Telegram, dan email.
- `templates`: template pesan.
- `processors`: orkestrasi proses notifikasi dari event atau queue.
- `providers`: implementasi provider melalui infrastructure adapter.

Business logic domain tidak boleh mengirim notifikasi secara langsung.

