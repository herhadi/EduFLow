# Ringkasan Data Sekolah pada Dashboard

## Tujuan

Ringkasan jumlah Guru Aktif, Siswa Aktif, Rombel, dan Mata Pelajaran merupakan modul bersama. Modul ini tidak dimiliki oleh satu role tertentu agar dapat digunakan ulang oleh role sekolah lain.

## Implementasi

- Komponen bersama: \`apps/frontend/components/dashboards/school-overview.tsx\`.
- Dashboard TU menggunakan \`audience="tu"\`.
- Dashboard Operator Sekolah menggunakan \`audience="operator"\`.
- Angka siswa dihitung dari siswa aktif yang memiliki enrollment aktif pada tahun ajaran pilihan sistem.
- Guru dan mata pelajaran dihitung dari data berstatus aktif; rombel dibatasi pada tahun ajaran aktif.

## Navigasi kartu

| Ringkasan | Tata Usaha | Operator Sekolah |
| --- | --- | --- |
| Guru Aktif | Import Guru & Siswa | Manajemen Guru |
| Siswa Aktif | Daftar Siswa Aktif TU | Daftar Siswa Aktif Operator |
| Rombel | Master Data | Master Akademik |
| Mata Pelajaran | Master Data | Master Akademik |

Daftar siswa menggunakan komponen yang sama pada kedua route. Perbedaan hanya pada konteks role dan tautan kembali ke dashboard.

## Tampilan

- Seluruh kartu ringkasan berupa tautan yang dapat diklik.
- Setiap kategori menggunakan aksen warna tersendiri.
- Hover, focus-visible, dan indikator panah memberi affordance interaksi.
- Warna latar, border, teks, dan focus ring memiliki pasangan dark mode yang kontras.
- Jika modul digunakan role lain, tambahkan konfigurasi tujuan pada komponen bersama; hindari menyalin logika ringkasan ke dashboard role baru.
