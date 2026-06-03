# Attendance Workflow: Guru Dan Siswa

Attendance workflow berpusat pada `DailyAgenda`. Guru tidak melakukan presensi terhadap `Schedule`.

## Aktor

- Guru: melihat agenda, mulai KBM, mengisi aktivitas, dan mencatat presensi.
- Siswa: menjadi objek presensi dalam agenda kelas.
- Operator: memantau agenda tertunda, kelas kosong, dan koreksi administratif.
- Wali kelas: melihat rekap kelas dan menindaklanjuti siswa bermasalah.
- Kepala sekolah: melihat monitoring dan laporan harian.
- Wali murid: menerima summary atau notifikasi penting.

## Status Agenda

| Status | Makna |
| --- | --- |
| `SCHEDULED` | Agenda sudah dibuat tetapi KBM belum dimulai |
| `IN_PROGRESS` | Guru sudah mulai aktivitas KBM |
| `COMPLETED` | KBM selesai dan presensi tersimpan |
| `CANCELLED` | Agenda dibatalkan karena alasan valid |
| `EMPTY` | Kelas kosong atau guru tidak hadir |

## Flow Sebelum KBM

```text
Schedule aktif
  -> Scheduler enqueue attendance:generate-agenda
  -> Worker membuat DailyAgenda untuk tanggal berjalan
  -> Scheduler enqueue teacher:reminder
  -> Guru menerima reminder sebelum jam mengajar
```

## Flow Guru Mengajar

```text
Guru login
  -> membuka agenda hari ini
  -> memilih agenda kelas
  -> mulai KBM
  -> DailyAgenda status IN_PROGRESS
  -> mengisi materi atau catatan aktivitas
  -> mengisi presensi siswa
  -> menyelesaikan KBM
  -> DailyAgenda status COMPLETED
```

## Flow Presensi Siswa

```text
Guru membuka daftar siswa kelas
  -> sistem menampilkan siswa berdasarkan StudentEnrollment aktif pada classId agenda dan schoolYearId agenda
  -> guru memilih status setiap siswa
  -> status: PRESENT, SICK, EXCUSED, ABSENT
  -> sistem membuat atau memakai Attendance milik agenda
  -> sistem menyimpan AttendanceItem
  -> sistem publish attendance.student.recorded
  -> jika ABSENT, sistem publish attendance.student.absent
```

## Flow Kelas Kosong

```text
Agenda melewati batas toleransi mulai KBM
  -> Worker mengecek DailyAgenda status SCHEDULED
  -> sistem menandai DailyAgenda status EMPTY
  -> publish attendance.class.empty
  -> notifikasi ke operator atau kepala sekolah
  -> masuk laporan harian
```

## Flow Koreksi Presensi

```text
Guru atau operator mengubah presensi
  -> sistem validasi permission attendance.manage
  -> sistem menyimpan perubahan
  -> sistem membuat AuditLog before dan after
  -> jika perubahan penting, publish attendance.student.recorded
```

## Aturan Validasi

- Agenda harus berada pada semester aktif.
- Guru hanya dapat mengelola agenda yang ditugaskan, kecuali memiliki permission administratif.
- Satu `DailyAgenda` hanya boleh memiliki satu `Attendance`.
- Presensi siswa harus unik per `attendanceId` dan `studentId`.
- Siswa yang muncul dalam presensi berasal dari `StudentEnrollment.isActive = true`.
- Agenda `COMPLETED` masih bisa dikoreksi jika user memiliki permission yang sesuai.
- Semua koreksi presensi wajib masuk audit.
- Notifikasi wali murid tidak dikirim langsung dari service presensi.

## Output Workflow

- `Attendance`
- `AttendanceItem`
- perubahan status `DailyAgenda`
- `AuditLog`
- event domain attendance
- queue job notifikasi atau summary
- data reporting harian
