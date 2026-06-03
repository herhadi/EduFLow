# Attendance Workflow: Guru Dan Siswa

Attendance workflow berpusat pada `DailyAgenda`. Guru tidak melakukan presensi terhadap `Schedule`.

## Aktor

- Guru: melihat agenda, mulai KBM, mengisi aktivitas, dan mencatat presensi.
- Siswa: menjadi objek presensi dalam agenda kelas.
- Operator: memantau agenda tertunda, kelas kosong, dan koreksi administratif.
- Wali kelas: melihat rekap kelas dan menindaklanjuti siswa bermasalah.
- Kepala sekolah: melihat monitoring dan laporan harian.
- Wali murid: menerima summary atau notifikasi penting melalui relasi `StudentGuardian`.

## Status Agenda

| Status | Makna |
| --- | --- |
| `SCHEDULED` | Agenda sudah dibuat tetapi KBM belum dimulai |
| `IN_PROGRESS` | Guru sudah mulai aktivitas KBM |
| `COMPLETED` | KBM selesai dan presensi tersimpan |
| `CANCELLED` | Agenda dibatalkan karena alasan valid |
| `EMPTY` | Kelas kosong atau guru tidak hadir |

## State Attendance

`DailyAgenda.status` menggambarkan kondisi agenda KBM. `Attendance.state` menggambarkan workflow presensi.

| State | Makna | Dampak |
| --- | --- | --- |
| `DRAFT` | Presensi sedang diisi guru | Belum masuk summary final |
| `SUBMITTED` | Guru sudah mengirim presensi | Siap dicek atau disetujui |
| `APPROVED` | Presensi disetujui operator atau wali kelas | Masuk summary dan laporan resmi |
| `CORRECTION_REQUESTED` | Ada permintaan koreksi | Guru atau operator harus memperbaiki |
| `CORRECTED` | Presensi sudah dikoreksi | Perlu approval ulang |
| `LOCKED` | Presensi dikunci setelah periode validasi | Tidak bisa diubah tanpa proses khusus |
| `VOID` | Presensi dibatalkan | Tidak masuk summary final |

## Transisi State Attendance

```text
DRAFT
  -> SUBMITTED
  -> APPROVED
  -> LOCKED

SUBMITTED
  -> CORRECTION_REQUESTED
  -> CORRECTED
  -> APPROVED

DRAFT atau SUBMITTED
  -> VOID
```

Aturan:

- `DRAFT` dibuat saat guru mulai presensi atau sistem membuat sesi presensi.
- `SUBMITTED` dibuat saat guru selesai mengisi dan mengirim presensi.
- `APPROVED` dipakai sebagai dasar summary resmi.
- `CORRECTION_REQUESTED` wajib menyimpan `correctionNote`.
- `CORRECTED` wajib menghasilkan audit `before` dan `after`.
- `LOCKED` menutup perubahan normal setelah summary atau batas waktu.
- `VOID` dipakai untuk pembatalan presensi yang valid, bukan penghapusan data.

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
  -> Attendance state SUBMITTED
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
  -> Attendance state CORRECTION_REQUESTED jika koreksi diminta reviewer
  -> sistem menyimpan perubahan
  -> Attendance state CORRECTED
  -> sistem membuat AuditLog before dan after
  -> jika perubahan penting, publish attendance.student.recorded
```

## Flow Approval

```text
Operator atau wali kelas membuka presensi SUBMITTED/CORRECTED
  -> validasi kelengkapan AttendanceItem
  -> jika valid, Attendance state APPROVED
  -> jika belum valid, Attendance state CORRECTION_REQUESTED
  -> sistem membuat AuditLog
```

## Flow Lock Summary

```text
Summary harian berjalan
  -> mengambil Attendance state APPROVED
  -> membuat rekap resmi
  -> Attendance state LOCKED setelah periode koreksi selesai
```

## Aturan Validasi

- Agenda harus berada pada semester aktif.
- Guru hanya dapat mengelola agenda yang ditugaskan, kecuali memiliki permission administratif.
- Satu `DailyAgenda` hanya boleh memiliki satu `Attendance`.
- Presensi siswa harus unik per `attendanceId` dan `studentId`.
- Siswa yang muncul dalam presensi berasal dari `StudentEnrollment.isActive = true`.
- Attendance `APPROVED` masih bisa dikoreksi melalui state `CORRECTION_REQUESTED`.
- Attendance `LOCKED` tidak bisa dikoreksi tanpa proses pembukaan khusus.
- Semua koreksi presensi wajib masuk audit.
- Notifikasi wali murid memakai `StudentGuardian` dan tidak dikirim langsung dari service presensi.

## Output Workflow

- `Attendance`
- `AttendanceItem`
- perubahan status `DailyAgenda`
- `AuditLog`
- event domain attendance
- queue job notifikasi atau summary
- data reporting harian
