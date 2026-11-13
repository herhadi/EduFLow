# Ringkasan Data Sekolah pada Dashboard

Kartu ringkasan membuka halaman daftar informasi read-only, bukan halaman pengaturan/master data.

- Kartu bersama: `components/dashboards/school-overview.tsx`.
- Daftar bersama: `components/dashboards/school-directory.tsx`.
- TU: `/tu/ringkasan/{guru|rombel|mapel}`.
- Operator: `/opsek/ringkasan/{guru|rombel|mapel}`.
- Siswa tetap memakai halaman daftar aktif yang sudah tersedia.
- Setiap daftar mendukung pencarian, preview cetak melalui PrintPreview, dan export spreadsheet Excel (.xls).
- Rombel dibatasi pada tahun ajaran pilihan; daftar guru dan mapel hanya data aktif.
- Halaman daftar tidak menyediakan aksi pengubahan data master.
- Komponen daftar dapat dipakai role sekolah lain tanpa menduplikasi logika.
