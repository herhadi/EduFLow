# AGENTS.md

# EduFlow

## Overview

EduFlow adalah sistem monitoring kegiatan belajar mengajar (KBM) sekolah berbasis:

* jadwal akademik,
* presensi siswa,
* monitoring guru,
* reminder otomatis,
* notifikasi wali murid,
* reporting sekolah,
* serta automation workflow akademik.

Project dirancang agar:

* scalable,
* maintainable,
* modular,
* event-driven,
* future-proof,
  tanpa memerlukan refactor besar ketika sistem berkembang.

---

# Main Stack

## Frontend

* Next.js
* TypeScript
* App Router

## Backend

* NestJS
* TypeScript

## Database

* PostgreSQL

## ORM

* Prisma

## Queue & Cache

* Redis
* BullMQ

---

# Monorepo Structure

Project menggunakan monorepo architecture.

## Main Structure

```txt
apps/
  backend/
  frontend/

packages/
  shared/
  types/
  constants/
  utils/

docs/
infra/
```

---

# Architecture Principles

## Modular Monolith

Backend menggunakan modular monolith architecture.

Semua domain dipisahkan dalam module independen tetapi tetap berada dalam satu backend service.

Tujuan:

* maintainability,
* scalability,
* consistency,
* easier future migration.

---

# Domain-Based Architecture

Gunakan pendekatan domain-based.

Jangan menggunakan page-based atau controller-based architecture.

---

# Backend Structure

## Recommended Structure

```txt
src/
  common/
  config/
  infrastructure/
  prisma/
  queue/
  workers/
  modules/
```

---

# Modules

## Auth Module

Berisi:

* authentication
* authorization
* JWT
* refresh token
* RBAC
* permissions

---

## Academic Module

Berisi:

* students
* teachers
* classes
* subjects
* schedules
* semesters
* school years

Academic module harus dipecah menjadi subdomain kecil ketika berkembang.

---

## Attendance Module

Berisi:

* daily agendas
* student attendance
* teacher activity
* class status
* attendance summaries

---

## Notification Module

Berisi:

* WhatsApp
* Telegram
* email
* templates
* notification processors

Semua pengiriman notifikasi wajib dipusatkan di module ini.

---

## Scheduler Module

Berisi:

* cron scheduling
* reminder scheduling
* recurring academic jobs

Scheduler hanya bertugas membuat job.

Scheduler bukan worker processor.

---

## Queue Module

Berisi:

* BullMQ queue
* queue registration
* queue orchestration

---

## Workers

Berisi:

* notification workers
* summary workers
* reminder workers
* reporting workers

Worker bertugas memproses background jobs.

---

## Reporting Module

Berisi:

* dashboard
* reports
* statistics
* school monitoring

---

## Audit Module

Berisi:

* activity logs
* audit trails
* change history

Audit wajib untuk semua perubahan data penting.

---

# Infrastructure Layer

Semua third-party integration harus berada di infrastructure layer.

## Example

* Redis
* WhatsApp provider
* Telegram provider
* email provider
* storage provider

Jangan campurkan integration logic dengan business logic domain.

---

# Shared & Common

## common/

Hanya untuk:

* shared decorators
* shared guards
* global exceptions
* truly shared utilities

Jangan menjadikan common sebagai tempat dumping utility.

---

## packages/

Digunakan untuk:

* shared types
* shared constants
* shared validation
* reusable utilities

Frontend dan backend dapat berbagi package.

---

# Event-Driven Principles

Gunakan event-driven mindset.

Jangan membuat domain saling bergantung langsung jika berkaitan dengan workflow besar.

---

## Example Events

```txt
attendance.created
attendance.absent
teacher.reminder
teacher.absent
class.empty
payment.paid
```

---

## Event Rules

* Event harus spesifik.
* Event sebaiknya berada di masing-masing domain.
* Hindari global event chaos.

---

# Schedule vs Daily Agenda

Jadwal adalah template tetap.

Agenda harian adalah realisasi jadwal pada tanggal tertentu.

Flow wajib:

```txt
Schedule
  ↓
Generate Daily Agenda
  ↓
Attendance & Activity
```

Jangan melakukan presensi langsung terhadap jadwal tetap.

---

# Database Principles

## PostgreSQL Is Source of Truth

Semua permanent data wajib berada di PostgreSQL.

Redis bukan database utama.

---

## UUID

Gunakan UUID untuk primary identifier utama.

---

## Soft Delete

Gunakan soft delete untuk entity penting.

---

## Audit Trail

Minimal audit menyimpan:

* user
* action
* timestamp
* before
* after

---

# Redis Usage

Redis digunakan untuk:

* BullMQ queue
* cache
* temporary state
* scheduler support
* rate limiting

---

# Queue Principles

Gunakan BullMQ untuk:

* WhatsApp notification
* Telegram notification
* email sending
* reminder
* daily summary
* reporting jobs

---

## Do Not Queue

* login
* simple CRUD
* realtime form response

---

# Notification Principles

Jangan kirim notifikasi langsung dari business logic.

## Wrong

```txt
attendanceService -> sendWhatsapp()
```

---

## Correct

```txt
attendanceService
  ↓
publish event
  ↓
notification worker
```

---

# Role & Permission

Gunakan permission-based RBAC.

Jangan hardcode role checking.

## Example

Wrong:

```txt
if role === "admin"
```

Gunakan permission system yang fleksibel.

---

# Multi Academic Year Support

Semua data akademik wajib mempertimbangkan:

* school year
* semester

---

# Logging

Gunakan centralized logging.

Minimal:

* info
* warning
* error

Hindari console.log untuk production.

---

# Frontend Principles

Frontend harus:

* mobile friendly
* responsive
* lightweight
* usable oleh guru sekolah

Prioritaskan usability dibanding visual kompleks.

---

# Initial MVP Scope

Tahap awal hanya fokus pada:

* authentication
* jadwal
* agenda harian
* reminder guru
* presensi siswa
* status kelas
* summary orang tua
* laporan kepala sekolah

---

# Avoid Premature Complexity

Jangan implement terlalu awal:

* microservice
* websocket realtime kompleks
* AI analytics
* face recognition
* GPS tracking
* advanced automation

Fokus utama adalah core workflow stability.

---

# Scalability Goals

System harus siap berkembang untuk:

* pembayaran sekolah
* SPP
* mobile app
* analytics
* multi sekolah
* AI integration
* advanced reporting

Tanpa refactor besar.

---

# Engineering Philosophy

Prioritaskan:

* maintainability
* modularity
* readability
* consistency
* scalability
* simplicity

Hindari:

* overengineering
* premature optimization
* hype-driven architecture

---

# Git Rules

* Jangan commit dist/
* Jangan commit .env
* Gunakan environment variables
* Gunakan migration untuk perubahan schema database

---

# Documentation

Semua architecture decision penting wajib didokumentasikan di:

```txt
docs/
```

Minimal:

* architecture
* database
* workflow
* event flow
* queue flow
* deployment
