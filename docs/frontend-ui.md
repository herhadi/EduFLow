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

- Aksi hapus permanen menggunakan gaya danger (merah solid). Reset password menggunakan warna info (biru), sedangkan nonaktifkan akun menggunakan gaya netral (outline) karena akun masih dapat dipulihkan. Pastikan kontras tetap baik pada light mode dan dark mode.
- Setiap aksi destruktif yang benar-benar dijalankan harus meminta konfirmasi sebelum memanggil API atau mengubah data. Konfirmasi menyebutkan objek yang terdampak dan konsekuensi penting; pembatalan tidak boleh menjalankan aksi.
- Tombol batal/tutup tetap netral. Menghapus pilihan lokal yang belum disimpan dapat menggunakan konfirmasi singkat bila kontrolnya secara eksplisit berlabel Hapus/Kosongkan.
- Gunakan `Button` dengan `variant="danger"` untuk aksi destruktif. Tombol refresh/status yang bersifat informatif dan bukan aksi utama sebaiknya memakai gaya netral (`variant="outline"` atau `ghost`), bukan warna biru solid. Hindari menggabungkan `variant="outline"` dengan kelas latar danger/info karena gaya outline dapat mengalahkan warna yang dimaksud, khususnya pada dark mode.
- Role pada sapaan akun menampilkan nama role dari backend dengan format Title Case; khusus `tu` ditampilkan sebagai `TU` dan `bk` sebagai `BK`. Nama database `super admin` adalah penggantian nama role lama `admin`; pemetaan ke kode navigasi internal `admin` hanya untuk kompatibilitas kode, bukan membuat role baru. Pemeriksaan pengelolaan role menggunakan nama database `super admin`.


## Navigasi bawah yang dapat diatur pengguna

- Susunan bottom navigation disimpan per akun pada kolom `User.mobileNavigationPreference`, sehingga preferensi mengikuti pengguna saat berpindah perangkat.
- Pengguna membuka menu **Lainnya > Atur Navigasi** untuk memindahkan menu antara Menu Utama dan Lainnya.
- Menu utama dibatasi maksimal empat item. Item pertama dipertahankan sebagai halaman awal role agar akses Beranda/Sistem tidak hilang.
- Urutan dapat diubah dengan drag-and-drop atau tombol Naik/Turun yang ramah layar sentuh.
- Daftar yang dapat dipilih selalu dibatasi pada menu yang tersedia untuk role aktif. Item yang tidak lagi tersedia tidak ditampilkan; menu baru ditambahkan ke Lainnya.
- Pengaturan disimpan ke backend, bukan hanya local storage, sehingga konsisten lintas perangkat dan sesi.


### Perbaikan navigasi personal (27 November 2026)

- Dropdown Lainnya dibatasi tinggi dan dapat digulir agar seluruh menu multi-role tetap dapat dijangkau di layar kecil.
- Aksi Atur Navigasi dipindahkan ke bagian atas dropdown agar mudah ditemukan.
- Memindahkan menu ke Menu Utama saat empat slot penuh otomatis menggantikan menu terakhir dan mengembalikannya ke Lainnya.
- Pengurutan tetap menyediakan tombol Naik/Turun sebagai cara utama yang kompatibel dengan layar sentuh; drag-and-drop menjadi opsi tambahan.
