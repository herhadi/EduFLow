# Frontend UI Components

Panduan ini menjadi acuan saat merapikan halaman frontend EduFlow agar pola UI konsisten dan tidak banyak duplikasi class.

## Lokasi

Komponen UI reusable berada di:

```txt
apps/frontend/components/ui/
```

## Komponen dasar

- `Button`: gunakan untuk aksi klik utama, sekunder, sukses, warning, atau danger. Hindari membuat class tombol manual jika variant yang ada sudah cukup.
- `Badge`: gunakan untuk status kecil seperti Menunggu, Disetujui, Ditolak, Belum Submit, Selesai, Aktif, atau risiko.
- `Card` dan `SurfaceCard`: gunakan untuk panel konten. `Card` untuk panel putih berborder, `SurfaceCard` untuk panel yang mengikuti gaya surface aplikasi.
- `EmptyState`: gunakan saat data kosong agar pesan kosong konsisten.
- `LoadingState`: gunakan untuk state memuat data.
- `SearchInput`: gunakan untuk pencarian sederhana, termasuk tombol hapus ketika dibutuhkan.
- `Pagination`: gunakan untuk daftar yang bisa panjang. Standar daftar manajemen menggunakan 10 data per halaman, pencarian mereset ke halaman pertama, dan jumlah halaman mengikuti hasil filter.
- `FormField` dan `fieldClass`: gunakan untuk label dan input form sederhana.
- `TableShell` dan `Table`: gunakan untuk tabel desktop yang perlu overflow horizontal aman.

## Aturan pemakaian

- Halaman baru sebaiknya memakai komponen dari `components/ui` sebelum menulis class manual.
- Migrasi halaman lama dilakukan bertahap per modul, bukan refactor massal.
- Class manual tetap boleh dipakai untuk layout spesifik halaman, tetapi status, tombol, empty, loading, search, form field, pagination, dan table shell sebaiknya memakai komponen global.
- Jika perlu variasi baru, tambahkan variant/tone di komponen global bila variasinya dipakai di lebih dari satu tempat.
- Pastikan tampilan mobile tidak overflow setelah migrasi, terutama untuk tabel, URL panjang, badge, dan tombol berderet.

## Warna aksi

- Aksi yang menghapus data, termasuk hapus permanen, wajib memakai `Button` dengan `variant="danger"` agar mudah dikenali sebagai tindakan berisiko.
- Aksi nonaktifkan, batal, atau tindakan yang masih dapat dipulihkan tidak memakai warna danger; gunakan variant sekunder/warning sesuai konteks.

## Standar tombol aksi destruktif

- Aksi yang menghapus, membuang, mereset, menonaktifkan, mengosongkan, atau membatalkan data/konfigurasi harus menggunakan gaya danger (merah solid dengan teks putih) yang tetap kontras pada light mode dan dark mode.
- Setiap aksi destruktif yang benar-benar dijalankan harus meminta konfirmasi sebelum memanggil API atau mengubah data. Konfirmasi menyebutkan objek yang terdampak dan konsekuensi penting; pembatalan tidak boleh menjalankan aksi.
- Tombol batal/tutup tetap netral. Menghapus pilihan lokal yang belum disimpan dapat menggunakan konfirmasi singkat bila kontrolnya secara eksplisit berlabel Hapus/Kosongkan.
- Gunakan `Button` dengan `variant="danger"` untuk aksi destruktif. Tombol refresh/status yang bersifat informatif dan bukan aksi utama sebaiknya memakai gaya netral (`variant="outline"` atau `ghost`), bukan warna biru solid. Hindari menggabungkan `variant="outline"` dengan kelas latar danger/info karena gaya outline dapat mengalahkan warna yang dimaksud, khususnya pada dark mode.
- Role pada sapaan akun menampilkan seluruh nama role dari backend dengan format Title Case; khusus singkatan `tu` ditampilkan sebagai `TU` dan `bk` sebagai `BK`. Perlakuan ini hanya untuk label tampilan, tidak mengubah identitas role, navigasi, maupun pemeriksaan hak akses.
