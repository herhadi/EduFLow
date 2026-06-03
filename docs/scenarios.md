# Scenarios

Dokumen ini berisi skenario operasional yang harus dipakai sebagai acuan implementasi service, worker, dan pengujian.

## Operational Cases

### 1. Guru Mendapat Reminder Dan Submit Presensi

**Trigger:** Scheduler membuat job `teacher:reminder:before-class`.

```text
teacher-reminder
  -> guru menerima reminder
  -> guru membuka DailyAgenda
  -> Attendance dibuat dengan state DRAFT
  -> guru mengisi AttendanceItem
  -> guru submit
  -> Attendance state SUBMITTED
  -> DailyAgenda status COMPLETED
  -> enqueue attendance:summary:daily
```

**Expected result:**

- `Attendance` ada untuk `DailyAgenda`.
- `AttendanceItem` dibuat berdasarkan `StudentEnrollment` aktif.
- `Attendance.submittedAt` terisi.
- `Attendance.submittedById` terisi.
- Summary job terkirim ke queue `attendance-summary`.

### 2. Operator Approve Presensi

**Trigger:** Operator atau wali kelas membuka attendance `SUBMITTED`.

```text
Attendance SUBMITTED
  -> validasi kelengkapan item
  -> approve
  -> Attendance state APPROVED
  -> enqueue attendance:summary:daily
```

**Expected result:**

- `Attendance.approvedAt` terisi.
- `Attendance.approvedById` terisi.
- `AuditLog` dibuat.
- Attendance boleh masuk summary resmi.

### 3. Summary Harian Terkirim

**Trigger:** Worker `attendance-summary` memproses `attendance:summary:daily`.

```text
Worker membaca Attendance APPROVED atau SUBMITTED sesuai mode MVP
  -> susun rekap kelas
  -> cari wali murid dari StudentGuardian
  -> enqueue notification:send:whatsapp atau notification:send:email
```

**Expected result:**

- Summary tidak membaca attendance `VOID`.
- Summary tidak menggandakan notifikasi jika job retry.
- Payload notification memakai identifier, bukan object besar.

## Failure Cases

### 1. Guru Tidak Membuka Kelas

**Trigger:** Agenda melewati batas toleransi mulai KBM.

```text
DailyAgenda SCHEDULED
  -> worker teacher:detect:absent berjalan
  -> DailyAgenda status EMPTY
  -> publish attendance.class.empty
  -> enqueue notification ke operator/kepala sekolah
```

**Expected result:**

- Tidak membuat `Attendance` valid.
- Masuk laporan kelas kosong.
- Operator bisa menindaklanjuti dengan guru pengganti.

### 2. Guru Membuka Kelas Tapi Tidak Submit

**Trigger:** Attendance masih `DRAFT` melewati batas toleransi.

```text
Attendance DRAFT
  -> reminder susulan
  -> jika tetap tidak submit, operator mendapat notifikasi
```

**Expected result:**

- `DailyAgenda` tetap `IN_PROGRESS` atau diberi flag follow-up oleh service.
- Summary resmi tidak memakai attendance `DRAFT`.
- Audit mencatat reminder atau follow-up administratif jika diperlukan.

### 3. Database Gagal Saat Submit

**Trigger:** Error ketika menyimpan `AttendanceItem` atau update state.

**Expected result:**

- Operasi submit harus atomic dalam transaction.
- Jika salah satu item gagal, state tidak berubah ke `SUBMITTED`.
- Tidak ada summary job sebelum transaction sukses.

### 4. Provider Notifikasi Gagal

**Trigger:** Worker `notification-send` gagal menghubungi WhatsApp, Telegram, atau email provider.

**Expected result:**

- Job retry mengikuti policy queue.
- Error memiliki `correlationId`.
- Domain data attendance tidak rollback karena notifikasi gagal.
- Failed job disimpan untuk retry manual.

## Correction Cases

### 1. Koreksi Presensi Sebelum Approval

**Trigger:** Guru menyadari input salah saat attendance masih `SUBMITTED`.

```text
SUBMITTED
  -> CORRECTION_REQUESTED
  -> koreksi AttendanceItem
  -> CORRECTED
  -> approval ulang
```

**Expected result:**

- `correctionNote` wajib terisi.
- `correctionAt` terisi.
- `correctedById` terisi.
- `AuditLog.before` dan `AuditLog.after` terisi.

### 2. Koreksi Presensi Setelah Approval

**Trigger:** Wali kelas atau operator meminta perbaikan attendance `APPROVED`.

```text
APPROVED
  -> CORRECTION_REQUESTED
  -> CORRECTED
  -> APPROVED
  -> summary diperbarui
```

**Expected result:**

- Summary lama dianggap perlu refresh.
- Notification correction dikirim jika perubahan penting.
- Semua perubahan item tercatat audit.

### 3. Koreksi Setelah Locked

**Trigger:** Attendance sudah `LOCKED`, tetapi ada kebutuhan administratif.

**Expected result:**

- Koreksi normal ditolak.
- Harus ada proses pembukaan khusus dengan permission tinggi.
- Audit wajib mencatat alasan pembukaan.

## Retry Cases

### 1. Generate Agenda Retry

**Trigger:** Job `attendance:generate-agenda` gagal lalu retry.

**Expected result:**

- Tidak membuat `DailyAgenda` duplikat.
- Idempotency memakai `scheduleId + date`.
- Jika agenda sudah ada, worker skip atau update aman.

### 2. Summary Retry

**Trigger:** Job `attendance:summary:daily` gagal setelah sebagian proses.

**Expected result:**

- Summary memakai key `date + classId + schoolYearId`.
- Notifikasi tidak terkirim ganda.
- Worker bisa dijalankan ulang tanpa merusak data.

### 3. Reminder Retry

**Trigger:** Job `teacher:reminder:before-class` gagal sementara.

**Expected result:**

- Retry maksimal 3 kali.
- Tidak spam guru dengan pesan identik.
- Jika agenda sudah `IN_PROGRESS` atau `COMPLETED`, reminder di-skip.

### 4. Notification Retry

**Trigger:** Provider WhatsApp/email timeout.

**Expected result:**

- Retry maksimal 5 kali dengan exponential backoff.
- Deduplication key mencegah pesan ganda.
- Setelah gagal final, operator bisa retry manual.

## Substitute Teacher Cases

### 1. Guru Utama Berhalangan Sebelum KBM

**Trigger:** Operator menunjuk guru pengganti sebelum kelas dimulai.

```text
DailyAgenda SCHEDULED
  -> operator assign guru pengganti
  -> reminder dikirim ke guru pengganti
  -> guru pengganti membuka kelas
```

**Expected result:**

- `DailyAgenda` tetap menjadi sumber aktivitas hari itu.
- Jadwal template `Schedule` tidak diubah.
- Audit mencatat perubahan guru pengajar harian.

### 2. Guru Utama Tidak Hadir Saat Jam Mulai

**Trigger:** Worker mendeteksi guru tidak membuka kelas.

```text
teacher:detect:absent
  -> publish teacher.class.absent
  -> operator assign guru pengganti
  -> DailyAgenda dilanjutkan oleh guru pengganti
```

**Expected result:**

- Tidak membuat schedule baru.
- Kelas tidak otomatis `EMPTY` jika guru pengganti ditugaskan dalam batas toleransi.
- Reporting mencatat guru utama absent dan guru pengganti mengajar.

### 3. Guru Pengganti Submit Presensi

**Trigger:** Guru pengganti menyelesaikan KBM.

**Expected result:**

- `Attendance.submittedById` berisi user guru pengganti.
- Audit mencatat actor sebenarnya.
- Summary menyebut kelas selesai dan tidak dianggap kosong.

## Catatan Implementasi Berikutnya

Untuk mendukung substitute teacher secara penuh, schema kemungkinan perlu menambahkan field seperti:

- `DailyAgenda.originalTeacherId`
- `DailyAgenda.assignedTeacherId`
- `DailyAgenda.substituteReason`

Tambahkan hanya saat service substitute teacher mulai diimplementasikan.
