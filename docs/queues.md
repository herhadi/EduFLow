# Queue Flow

BullMQ queues are registered centrally in `apps/backend/src/queue/queue.module.ts`. Queue names live in `packages/constants`.

## Queues

- `notification`: WhatsApp, Telegram, and email delivery.
- `reminder`: teacher and academic reminders.
- `summary`: parent and daily summaries.
- `reporting`: asynchronous report generation.

## Boundaries

- Scheduler modules create recurring or delayed jobs.
- Queue modules register and orchestrate queues.
- Workers process background jobs.
- Infrastructure adapters communicate with third-party providers.
- Domain modules publish events rather than send notifications directly.

