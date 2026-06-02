# Konvensi Queue

Queue BullMQ didaftarkan terpusat di `apps/backend/src/queue/queue.module.ts`. Nama queue disimpan di `packages/shared`.

Gunakan format:

```text
domain:action
```

## Queue Awal

- `notification:send`
- `attendance:summary`
- `teacher:reminder`
- `report:daily`

## Batas Tanggung Jawab

- Scheduler membuat recurring atau delayed job.
- Queue module mendaftarkan dan mengorkestrasi queue.
- Worker memproses background job.
- Infrastructure adapter berkomunikasi dengan provider pihak ketiga.
- Domain module menerbitkan event, bukan mengirim notifikasi secara langsung.

