# Demo Flow Guru Sampai Summary

Endpoint demo:

```http
POST /api/attendance/demo/teacher-flow
```

Alur yang dijalankan:

```text
Guru mendapat reminder
↓
Guru buka kelas
↓
Attendance terbuat
↓
Guru submit
↓
Summary terkirim
SELESAI
```

Endpoint ini membuat data demo minimal jika diperlukan:

- tahun ajaran,
- semester,
- kelas,
- mapel,
- guru,
- jadwal,
- agenda harian,
- siswa,
- enrollment siswa,
- attendance dan attendance item.

Endpoint bersifat sementara untuk melihat workflow backend sebelum UI dan modul production lengkap dibuat.

