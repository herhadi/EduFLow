# Standar Preview dan Cetak Dokumen EduFlow

## Prinsip

Gunakan satu dokumen HTML sebagai sumber preview layar dan proses cetak. Data modul (misalnya buku kas, laporan, atau rekap transaksi) dirender ke template dokumen yang sama. Jangan membuat template preview dan template cetak yang terpisah.

## Ukuran kertas

- Default: **F4 Portrait, 210 × 330 mm**.
- Komponen tetap mendukung ukuran lain melalui konfigurasi, misalnya A4 Portrait (210 × 297 mm) atau A4 Landscape (297 × 210 mm).
- Ukuran fisik dokumen tidak boleh berubah mengikuti lebar layar.

## Preview desktop dan mobile

- Preview dibuka sebagai tampilan dokumen tersendiri (overlay penuh), bukan panel di sisi daftar.
- Toolbar berada di luar kertas dan menyediakan aksi sesuai modul, misalnya Cetak, Download Excel, dan Tutup.
- Setiap kelompok/kelas yang dipilih dirender sebagai satu halaman kertas putih; beberapa pilihan ditampilkan sebagai tumpukan halaman yang dapat di-scroll.
- Desktop: kertas putih berada di tengah area preview; area dapat di-scroll.
- Mobile: dokumen tetap menggunakan ukuran F4/A4 yang dipilih, lalu diperkecil secara proporsional dengan CSS `zoom`.
- Breakpoint mobile:
  - Maksimal 480px: `zoom: 0.46`
  - 481–600px: `zoom: 0.56`
  - 601–900px: `zoom: 0.72`
- Toolbar disusun vertikal pada layar kecil.
- Jangan mengubah ukuran dokumen menjadi ukuran layar ponsel.

## Proses cetak

Cetak dilakukan melalui hidden iframe, bukan dengan `window.print()` pada halaman aplikasi atau membuka tab/jendela baru.

1. Ambil elemen dokumen preview berdasarkan ID. ID default komponen adalah `jimpitan-print-paper`.
2. Buat iframe tersembunyi khusus cetak.
3. Salin stylesheet dan struktur dokumen sumber ke iframe.
4. Tunggu stylesheet dan font siap sebelum memanggil dialog cetak.
5. Terapkan `@page` sesuai ukuran kertas yang dipilih.
6. Paksa ukuran dokumen dan skala cetak kembali ke 100%: `zoom: 1 !important` dan `transform: none !important`.
7. Jalankan `printWindow.print()`, kemudian bersihkan iframe setelah proses cetak selesai.

Contoh aturan dasar untuk F4:

```css
@page {
  size: 210mm 330mm;
  margin: 0;
}

#jimpitan-print-paper {
  width: 210mm !important;
  min-height: 330mm !important;
  padding: 12mm 13mm !important;
  zoom: 1 !important;
  transform: none !important;
}
```

## Pagination, tabel, dan footer

- Nomor halaman cetak menggunakan CSS paged media, misalnya `counter(page)` dan `counter(pages)`; indikator halaman preview tetap menampilkan format **Halaman 1/3**.
- Gunakan `break-inside: avoid` dan `page-break-inside: avoid` pada baris tabel atau blok yang tidak boleh terpotong.
- Ulangi header/footer tabel melalui `display: table-header-group` dan `display: table-footer-group` bila diperlukan.
- Footer dokumen memuat tanggal cetak dan keterangan dokumen.
- Uji laporan panjang untuk memastikan tidak ada halaman kosong, pemotongan baris, atau konten yang keluar dari area kertas.

## Komponen bersama

Gunakan `apps/frontend/components/print/print-preview.tsx` untuk preview dan pencetakan lintas modul. Komponen menerima judul, daftar halaman, ukuran kertas, ID dokumen, dan keterangan footer. Ukuran default komponen adalah F4 Portrait.

Setiap modul bertanggung jawab menyusun data dan konten halaman serta aksi ekspor data bila tersedia. Komponen bersama bertanggung jawab atas preview responsif layar penuh, toolbar (Cetak/Download Excel/Tutup), iframe cetak, skala 100%, dan aturan halaman.

## Checklist sebelum rilis

- Preview desktop dan mobile menampilkan dokumen dengan proporsi yang sama.
- Toolbar tidak ikut tercetak.
- Hasil cetak menggunakan ukuran fisik yang dipilih dan skala 100%.
- Isi preview dan cetak berasal dari struktur HTML yang sama.
- Nomor halaman sesuai jumlah halaman hasil cetak.
- Tabel panjang tidak terpotong secara tidak semestinya.
- Tidak muncul halaman kosong di awal, tengah, atau akhir dokumen.
