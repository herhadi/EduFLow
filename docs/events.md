# Konvensi Event

Event wajib berada di domain pemiliknya dan menggunakan format:

```text
domain.entity.action
```

## Event Attendance

- `attendance.student.created`
- `attendance.student.absent`
- `attendance.class.empty`

Definisi berada di `apps/backend/src/modules/attendance/events/attendance.events.ts`.

## Event Teacher

- `teacher.class.reminder`
- `teacher.class.absent`

Definisi berada di `apps/backend/src/modules/academic/events/teacher.events.ts`.

Domain service tidak boleh memanggil provider notifikasi secara langsung. Listener event dapat membuat queue job.

