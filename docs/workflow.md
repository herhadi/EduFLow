# Workflow

## Daily Academic Flow

```text
Schedule
  -> Scheduler creates agenda-generation job
  -> Worker generates DailyAgenda
  -> Teacher records activity and student attendance
  -> Domain publishes specific event
  -> Queue orchestration creates notification or summary job
  -> Worker processes delivery or report
```

The scheduler creates jobs only. Workers perform asynchronous processing.

