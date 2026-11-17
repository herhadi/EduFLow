# Pengelolaan Telegram Webhook

Pengaturan URL webhook EduFlow dikelola melalui halaman **System → Telegram** (/system/telegram).

1. Buka kolom **Webhook URL**.
2. Masukkan URL HTTPS lengkap ke endpoint webhook EduFlow.
3. Klik **Simpan URL**. Nilai disimpan di tabel SystemSetting dengan key TELEGRAM_WEBHOOK_URL.
4. Klik **Set Webhook** untuk mendaftarkan URL tersebut ke Telegram.
5. Gunakan **Refresh Status** untuk memeriksa URL yang terpasang dan status dari Telegram.

Nilai yang disimpan di database menjadi prioritas di atas TELEGRAM_WEBHOOK_URL dari environment. Jika belum ada nilai database, aplikasi tetap menggunakan konfigurasi environment lama atau membentuk URL dari FRONTEND_URL.

TELEGRAM_BOT_TOKEN tetap menjadi konfigurasi rahasia backend. TELEGRAM_WEBHOOK_SECRET dan TELEGRAM_BOT_USERNAME bersifat opsional. Jangan menaruh token bot di kolom URL webhook.

Tombol **Hapus Webhook** menghapus pendaftaran webhook di sisi Telegram, bukan menghapus URL yang tersimpan di EduFlow. Konfirmasi ditampilkan sebelum tindakan dijalankan. Setelah penghapusan, gunakan **Set Webhook** untuk memasangnya kembali.
