# Deployment Guide - EduFlow

## Tujuan

Dokumen ini menjelaskan standar deployment EduFlow ke server production menggunakan Docker Compose, GitHub Actions, GitHub Self-hosted Runner, dan Cloudflare Tunnel.

---

# Arsitektur

```text
Developer (Mac / Windows)
        │
        ▼
     Git Push
        │
        ▼
      GitHub
        │
        ▼
GitHub Actions Workflow
        │
        ▼
GitHub Self-hosted Runner
        │
        ▼
Debian Production Server
        │
        ▼
scripts/deploy.sh
        │
        ▼
Docker Compose
        │
 ┌───────────────┐
 │ Frontend      │
 │ Backend       │
 │ PostgreSQL    │
 │ Redis         │
 └───────────────┘
        │
        ▼
Cloudflare Tunnel
        │
        ▼
https://eduflow.tripleatech.my.id
```

---

# Infrastruktur

## Server

* OS : Debian
* Docker Compose
* GitHub Self-hosted Runner
* Cloudflare Tunnel
* Cloudflare Access
* PostgreSQL
* Redis

## Domain

| Service              | URL                               |
| -------------------- | --------------------------------- |
| Frontend             | https://eduflow.tripleatech.my.id |
| SSH                  | ssh.tripleatech.my.id             |
| PostgreSQL (Private) | postgres.tripleatech.my.id        |

---

# Struktur Repository

```text
EduFlow/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       ├── test-runner.yml
│       ├── backup-db.yml
│       └── rollback.yml
│
├── scripts/
│   ├── deploy.sh
│   ├── healthcheck.sh
│   ├── migrate.sh
│   ├── rollback.sh
│   ├── backup-db.sh
│   └── lib/
│       ├── log.sh
│       ├── docker.sh
│       └── common.sh
│
├── apps/
├── packages/
├── docker-compose.yml
└── docs/
    └── DEPLOYMENT.md
```

---

# Deployment Flow

1. Developer melakukan perubahan kode.
2. Commit dan push ke branch `main`.
3. GitHub Actions mendeteksi perubahan.
4. Workflow dijalankan pada GitHub Self-hosted Runner.
5. Runner menjalankan `scripts/deploy.sh`.
6. Deployment selesai.
7. Health Check dijalankan.
8. Status deployment dicatat dan (nantinya) dikirim ke Telegram.

---

# Prinsip Deployment

* GitHub adalah **source of truth**.
* Production server tidak digunakan sebagai tempat development utama.
* Deployment dilakukan secara otomatis oleh GitHub Actions.
* Semua script deployment berada di repository agar terversi dan mudah direview.
* Deployment harus dapat dijalankan baik oleh GitHub Actions maupun secara manual.

---

# Smart Deployment

Deployment hanya membangun service yang berubah.

| Perubahan            | Aksi                             |
| -------------------- | -------------------------------- |
| `apps/frontend/**`   | Build frontend                   |
| `apps/backend/**`    | Build backend                    |
| `packages/shared/**` | Build frontend dan backend       |
| `prisma/**`          | Build backend + Prisma Migration |
| `docker-compose.yml` | Build seluruh service            |
| `.github/**`         | Tidak melakukan deployment       |

Tujuan Smart Deployment adalah mengurangi waktu build dan meminimalkan downtime.

---

# Deployment Script

Semua proses deployment berada pada:

```text
scripts/deploy.sh
```

Script ini bertanggung jawab untuk:

* Validasi environment.
* Deteksi perubahan.
* Update source code.
* Build Docker image.
* Restart container.
* Menjalankan Prisma Migration.
* Menjalankan Prisma Seed (jika diperlukan).
* Health Check.
* Membersihkan image Docker yang tidak terpakai.

Workflow GitHub hanya memanggil script tersebut.

---

# GitHub Actions

Workflow deployment berada pada:

```text
.github/workflows/deploy.yml
```

Workflow bertugas:

* Menjalankan deployment saat terdapat push ke branch `main`.
* Menjalankan deployment melalui GitHub Self-hosted Runner.
* Menampilkan log deployment.
* Mengembalikan status berhasil atau gagal.

Logika deployment tidak ditulis di dalam workflow, tetapi didelegasikan ke `scripts/deploy.sh`.

---

# Health Check

Setelah deployment selesai dilakukan pemeriksaan:

* Frontend dapat diakses.
* Backend merespons dengan normal.
* Container Docker berada pada status `running`.

Apabila Health Check gagal, deployment dianggap gagal.

---

# Rollback

Rollback akan diimplementasikan pada fase berikutnya.

Target implementasi:

* Menyimpan image sebelumnya.
* Mengembalikan container ke versi terakhir yang stabil.
* Menjalankan Health Check ulang.

---

# Backup Database

Sebelum menjalankan Prisma Migration, sistem akan:

1. Membuat backup PostgreSQL.
2. Menyimpan backup sesuai kebijakan retensi.
3. Melanjutkan migration apabila backup berhasil.

Fitur ini akan ditambahkan pada fase berikutnya.

---

# Notifikasi

Deployment akan mengirimkan notifikasi Telegram yang berisi:

* Repository
* Branch
* Commit
* Author
* Durasi deployment
* Status deployment
* Ringkasan perubahan (opsional)

---

# Struktur Lingkungan

## Development

* VS Code (Mac atau Windows)
* Git
* Docker Desktop (opsional)
* PostgreSQL lokal (opsional)

## Production

* Debian
* Docker Compose
* GitHub Runner
* Cloudflare Tunnel
* Cloudflare Access

---

# Workflow Developer

1. Mengembangkan fitur di branch kerja.
2. Melakukan commit.
3. Push ke GitHub.
4. Membuat Pull Request (opsional).
5. Merge ke `main`.
6. Deployment berjalan otomatis.

Developer tidak perlu melakukan SSH ke server untuk deployment normal.

---

# Manual Deployment

Apabila deployment otomatis mengalami gangguan, deployment masih dapat dijalankan secara manual melalui server.

```bash
cd /srv/eduflow/app
./scripts/deploy.sh
```

Dengan demikian proses deployment manual dan otomatis menggunakan mekanisme yang sama.

---

# Roadmap CI/CD

## Versi 1

* GitHub Self-hosted Runner
* Automatic Deployment
* Docker Compose Deployment

## Versi 2

* Smart Deployment
* Health Check
* Logging yang lebih baik

## Versi 3

* PostgreSQL Backup
* Telegram Notification
* Automatic Rollback

## Versi 4

* Multi Environment (Development, Staging, Production)
* Zero Downtime Deployment
* Blue-Green Deployment (opsional)

---

# Best Practices

* Jangan melakukan perubahan langsung pada server production kecuali untuk kebutuhan darurat.
* Semua perubahan konfigurasi sebaiknya dilakukan melalui repository.
* Gunakan GitHub sebagai sumber utama kode.
* Simpan script operasional di dalam repository agar terdokumentasi dan terversi.
* Lakukan pengujian workflow setelah setiap perubahan pada pipeline CI/CD.
