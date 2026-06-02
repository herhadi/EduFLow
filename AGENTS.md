# AGENTS.md

# School Academic Monitoring System

## Project Vision

Membangun sistem monitoring kegiatan belajar mengajar (KBM) sekolah berbasis jadwal, presensi, notifikasi, dan reporting yang scalable, modular, serta siap dikembangkan menjadi sistem akademik sekolah yang lebih besar di masa depan.

Project ini fokus pada:

* monitoring aktivitas belajar mengajar,
* reminder guru,
* presensi siswa,
* notifikasi wali murid,
* monitoring kelas kosong,
* reporting sekolah.

Project dirancang agar:

* maintainable,
* scalable,
* modular,
* future-proof,
  tanpa memerlukan refactor besar ketika fitur berkembang.

---

# Main Technology Stack

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

## Cache / Queue

* Redis
* BullMQ

---

# Architecture Principles

## Modular Monolith

Project menggunakan modular monolith architecture.

Setiap domain dipisahkan dalam module terpisah tetapi tetap berada dalam satu backend service.

Tujuan:

* maintainability,
* scalability,
* easier testing,
* future microservice migration.

---

# Domain-Driven Structure

Project harus menggunakan pendekatan domain-based, bukan feature-page based.

## Correct Example

* academic
* attendance
* notification
* finance
* reporting

## Wrong Example

* dashboardController
* adminController
* pageController

---

# Core Modules

## Auth Module

Berisi:

* authentication
* authorization
* JWT
* refresh token
* RBAC

---

## Academic Module

Berisi:

* siswa
* guru
* kelas
* mapel
* tahun ajaran
* semester
* jadwal

---

## Attendance Module

Berisi:

* agenda harian
* presensi siswa
* aktivitas mengajar
* status kelas

---

## Notification Module

Berisi:

* WhatsApp
* Telegram
* email
* reminder
* summary

Semua notifikasi harus dipusatkan di module ini.

---

## Reporting Module

Berisi:

* dashboard
* statistik
* rekap
* laporan kepala sekolah

---

## Finance Module (Future)

Berisi:

* SPP
* tagihan
* pembayaran
* invoice

---

# Core Concepts

## Schedule vs Daily Agenda

Jadwal adalah template tetap.

Agenda harian adalah realisasi jadwal pada tanggal tertentu.

Jangan melakukan presensi langsung terhadap jadwal.

Flow:
Schedule -> Generate Daily Agenda -> Attendance

Ini penting untuk:

* guru pengganti,
* kelas libur,
* ujian,
* perubahan jadwal,
* kegiatan khusus.

---

# Event-Driven Mindset

Gunakan event-driven architecture secara internal.

Jangan membuat module saling memanggil secara langsung jika berkaitan dengan workflow besar.

## Example Events

* attendance.created
* teacher.reminder
* payment.paid
* class.empty
* teacher.absent

Module lain dapat merespons event tersebut.

---

# Queue & Background Jobs

Semua proses berat dan asynchronous wajib menggunakan BullMQ.

## Use Queue For

* WhatsApp notification
* Telegram notification
* reminder
* daily summary
* reporting
* scheduled jobs

## Do Not Use Queue For

* login
* CRUD sederhana
* realtime form response

---

# Redis Usage

Redis digunakan untuk:

* BullMQ queue
* cache
* temporary state
* scheduler support
* rate limiting

Redis bukan source of truth.

Semua permanent data tetap berada di PostgreSQL.

---

# Database Principles

## PostgreSQL Is Source of Truth

Semua data utama wajib disimpan di PostgreSQL.

---

## Use UUID

Gunakan UUID sebagai primary identifier.

Hindari integer auto increment untuk entity utama.

---

## Soft Delete

Gunakan soft delete untuk entity penting.

Jangan hard delete kecuali benar-benar diperlukan.

---

## Audit Trail

Semua perubahan penting wajib memiliki audit log.

Minimal:

* user
* action
* timestamp
* before
* after

Audit wajib untuk:

* presensi
* pembayaran
* jadwal
* perubahan data penting

---

# Multi Academic Year Support

Semua data akademik harus mempertimbangkan:

* tahun ajaran
* semester

Jangan mencampur data lintas tahun ajaran tanpa konteks akademik.

---

# Role & Permission

Gunakan permission-based RBAC.

Jangan hardcode:
if role === "admin"

Role sekolah dapat berkembang:

* admin
* guru
* wali kelas
* kepala sekolah
* TU
* BK
* operator
* orang tua

Permission harus fleksibel.

---

# Notification Principles

Jangan kirim notifikasi langsung dari business logic.

## Wrong

attendanceService -> sendWhatsapp()

## Correct

attendanceService -> publish event
notification module -> process event

---

# Scheduler Principles

Scheduler adalah core system.

Semua automation:

* reminder guru
* summary harian
* deteksi kelas kosong
* reminder pembayaran

harus terpusat dan terstruktur.

Jangan membuat cron tersebar di project.

---

# Logging

Gunakan centralized logging.

Minimal:

* info
* warning
* error

Jangan mengandalkan console.log untuk production.

---

# Frontend Principles

Frontend harus:

* mobile friendly,
* responsive,
* lightweight,
* mudah digunakan guru.

Prioritaskan usability dibanding visual berlebihan.

---

# Initial MVP Scope

Fokus tahap awal:

## Mandatory Features

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

Jangan implement:

* AI
* face recognition
* realtime websocket kompleks
* microservice
* GPS tracking
* advanced analytics

hingga core workflow benar-benar stabil.

---

# Scalability Goal

System harus siap berkembang untuk:

* pembayaran sekolah,
* multi sekolah,
* mobile apps,
* analytics,
* advanced reporting,
* AI integration.

Namun implementasi dilakukan bertahap tanpa overengineering.

---

# Engineering Philosophy

Prioritaskan:

* maintainability,
* readability,
* modularity,
* consistency,
* long-term scalability.

Bukan:

* over optimization,
* hype technology,
* unnecessary complexity.

Project harus mudah dipahami dan mudah dikembangkan dalam jangka panjang.
