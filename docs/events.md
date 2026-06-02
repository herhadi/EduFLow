# Event Flow

Events belong to the domain that publishes them. Avoid a global bucket of unrelated events.

## Attendance Events

- `attendance.created`
- `attendance.absent`
- `class.empty`

Defined in `apps/backend/src/modules/attendance/events/attendance.events.ts`.

## Teacher Events

- `teacher.reminder`
- `teacher.absent`

Defined in `apps/backend/src/modules/academic/events/teacher.events.ts`.

Event listeners may enqueue jobs, but domain services must not call notification providers directly.

