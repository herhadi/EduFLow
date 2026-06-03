# Event Flow: Alur Sistem Nyata

Event digunakan untuk memisahkan workflow besar antar domain. Domain service menerbitkan event, listener atau processor yang menentukan job lanjutan.

## Konvensi Nama Event

Gunakan format:

```text
domain.entity.action
```

Contoh:

- `attendance.student.recorded`
- `attendance.student.absent`
- `attendance.class.empty`
- `teacher.class.reminder`
- `teacher.class.absent`
- `notification.message.sent`
- `notification.message.failed`

## Aturan Event

- Event harus spesifik dan bermakna bisnis.
- Event berada di domain pemiliknya.
- Event tidak boleh menjadi tempat membawa semua data mentah.
- Payload cukup berisi identifier dan metadata penting.
- Handler event boleh membuat queue job.
- Handler event tidak boleh menjalankan proses berat secara sinkron.
- Provider notifikasi tidak boleh dipanggil langsung dari domain service.

## Payload Minimal

```ts
type DomainEventPayload = {
  eventId: string;
  occurredAt: string;
  actorUserId?: string;
  correlationId?: string;
  data: Record<string, unknown>;
};
```

## Flow Generate Agenda Harian

```text
Scheduler
  -> enqueue attendance:generate-agenda
  -> Worker membaca Schedule aktif
  -> Worker membuat DailyAgenda
  -> publish attendance.agenda.generated
  -> Reporting listener dapat enqueue report atau summary
```

Catatan: event `attendance.agenda.generated` belum dibuat di kode awal, tetapi disarankan ketika implementasi agenda generation dimulai.

## Flow Reminder Guru

```text
Scheduler
  -> enqueue teacher:reminder:before-class
  -> ReminderWorker membaca DailyAgenda mendatang
  -> publish teacher.class.reminder
  -> Notification processor enqueue notification:send
  -> NotificationWorker mengirim pesan
  -> publish notification.message.sent atau notification.message.failed
```

## Flow Presensi Siswa

```text
Guru menyimpan presensi
  -> AttendanceService menyimpan Attendance dan AttendanceItem
  -> publish attendance.student.recorded
  -> Jika status ABSENT, publish attendance.student.absent
  -> Notification processor mencari Guardian melalui StudentGuardian
  -> Notification processor enqueue notification:send untuk wali murid
  -> Summary processor enqueue attendance:summary jika diperlukan
```

## Flow Kelas Kosong

```text
Worker deteksi guru belum mulai KBM
  -> update DailyAgenda status EMPTY
  -> publish attendance.class.empty
  -> enqueue notification:send ke operator atau kepala sekolah
  -> enqueue report:daily untuk rekap monitoring
```

## Flow Teacher Absent

```text
ReminderWorker atau AttendanceWorker mendeteksi guru tidak hadir
  -> publish teacher.class.absent
  -> enqueue notification:send ke operator
  -> operator dapat menunjuk guru pengganti
  -> DailyAgenda tetap menjadi sumber aktivitas hari itu
```

## Lokasi Event Saat Ini

- Attendance: `apps/backend/src/modules/attendance/events/attendance.events.ts`
- Teacher: `apps/backend/src/modules/academic/events/teacher.events.ts`
