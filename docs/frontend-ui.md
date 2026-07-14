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
- `Pagination`: gunakan untuk daftar yang bisa panjang.
- `FormField` dan `fieldClass`: gunakan untuk label dan input form sederhana.
- `TableShell` dan `Table`: gunakan untuk tabel desktop yang perlu overflow horizontal aman.

## Aturan pemakaian

- Halaman baru sebaiknya memakai komponen dari `components/ui` sebelum menulis class manual.
- Migrasi halaman lama dilakukan bertahap per modul, bukan refactor massal.
- Class manual tetap boleh dipakai untuk layout spesifik halaman, tetapi status, tombol, empty, loading, search, form field, pagination, dan table shell sebaiknya memakai komponen global.
- Jika perlu variasi baru, tambahkan variant/tone di komponen global bila variasinya dipakai di lebih dari satu tempat.
- Pastikan tampilan mobile tidak overflow setelah migrasi, terutama untuk tabel, URL panjang, badge, dan tombol berderet.
