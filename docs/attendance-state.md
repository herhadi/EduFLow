# Attendance State

Attendance state menentukan apakah presensi masih draft, perlu approval, bisa dikoreksi, boleh masuk summary, atau sudah terkunci.

## State

| State | Deskripsi |
| --- | --- |
| `DRAFT` | Presensi dibuat dan masih diisi |
| `SUBMITTED` | Guru sudah mengirim presensi |
| `APPROVED` | Presensi disetujui dan boleh masuk laporan resmi |
| `CORRECTION_REQUESTED` | Reviewer meminta koreksi |
| `CORRECTED` | Presensi sudah dikoreksi dan menunggu approval ulang |
| `LOCKED` | Presensi dikunci setelah validasi atau summary |
| `VOID` | Presensi dibatalkan tetapi tidak dihapus |

## Penggunaan State

- Koreksi hanya berjalan melalui `CORRECTION_REQUESTED` dan `CORRECTED`.
- Approval hanya dilakukan pada `SUBMITTED` atau `CORRECTED`.
- Summary resmi hanya membaca `APPROVED`.
- Kelas kosong divalidasi dari `DailyAgenda.status = EMPTY` dan tidak memiliki attendance yang valid.
- Audit wajib dibuat pada perubahan state dan perubahan item presensi.
- Perubahan state wajib menyimpan actor: submitter, approver, corrector, atau locker.

## Transisi Valid

```text
DRAFT -> SUBMITTED
SUBMITTED -> APPROVED
SUBMITTED -> CORRECTION_REQUESTED
CORRECTION_REQUESTED -> CORRECTED
CORRECTED -> APPROVED
APPROVED -> LOCKED
DRAFT -> VOID
SUBMITTED -> VOID
```

Transisi lain harus dianggap invalid kecuali ada proses administratif khusus.
