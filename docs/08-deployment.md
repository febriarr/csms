# Deployment Guide

Dokumen ini menjelaskan bagaimana CI-CSMS dijalankan mulai dari lingkungan development hingga production.

Deployment dirancang agar sederhana untuk MVP, namun tetap memiliki struktur yang mudah dikembangkan ketika jumlah perangkat dan pengguna meningkat.

---

# Deployment Architecture

```
                 Internet
                     │
                     ▼
             Reverse Proxy (Nginx)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Express API          Static Assets
          │
          ▼
     PostgreSQL Database
```

---

# Technology Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Runtime     | Node.js                  |
| Language    | TypeScript               |
| Framework   | Express.js               |
| View Engine | EJS                      |
| ORM         | Drizzle ORM              |
| Database    | PostgreSQL               |
| Realtime    | Server-Sent Events (SSE) |

---

# Project Structure

```
ci-csms/
│
├── docs/
├── drizzle/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── views/
│   ├── public/
│   └── app.ts
│
├── .env.example
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

---

# Environment Variables

Seluruh konfigurasi aplikasi disimpan pada file `.env`.

Contoh:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms

APP_NAME=CI-CSMS

APP_URL=http://localhost:3000
```

Untuk production:

```env
NODE_ENV=production

PORT=3000

DATABASE_URL=postgres://...
```

File `.env` **tidak boleh** disimpan ke repository.

Repository hanya menyediakan:

```
.env.example
```

---

# Development Environment

Minimum requirement:

| Software   | Version                |
| ---------- | ---------------------- |
| Node.js    | 22 LTS atau lebih baru |
| PostgreSQL | 17                     |
| pnpm       | Latest                 |
| Git        | Latest                 |

---

# Installation

Clone repository.

```bash
git clone https://github.com/username/ci-csms.git
```

Masuk ke project.

```bash
cd ci-csms
```

Install dependency.

```bash
pnpm install
```

---

# Database Migration

Generate migration.

```bash
pnpm db:generate
```

Menjalankan migration.

```bash
pnpm db:migrate
```

Membuka Drizzle Studio.

```bash
pnpm db:studio
```

---

# Running Application

Development

```bash
pnpm dev
```

Production Build

```bash
pnpm build
```

Production Start

```bash
pnpm start
```

---

# Build Process

```
TypeScript

↓

Compile

↓

JavaScript

↓

Node.js Runtime
```

Seluruh file TypeScript dikompilasi sebelum aplikasi dijalankan di production.

---

# Static Assets

Asset statis berada pada folder:

```
src/public
```

Contoh:

- CSS
- JavaScript
- Images

---

# Views

Template EJS berada pada folder:

```
src/views
```

Contoh:

```
layouts/

dashboard/

partials/
```

---

# Database Connection

Express berkomunikasi dengan PostgreSQL melalui Drizzle ORM.

```
Express

↓

Drizzle ORM

↓

PostgreSQL
```

Seluruh akses database dilakukan melalui Repository Layer.

---

# Logging

Versi MVP menggunakan logging sederhana melalui console.

Contoh:

```
Application Started

Database Connected

Temperature Received

Alert Created
```

Pengembangan selanjutnya dapat menggunakan:

- Pino
- Winston

---

# Error Handling

Semua error ditangani oleh Global Error Handler.

Flow:

```
Controller

↓

Service

↓

Throw Error

↓

Error Middleware

↓

HTTP Response
```

Hal ini menjaga format error tetap konsisten.

---

# Production Deployment

Arsitektur production sederhana.

```
Internet
      │
      ▼
Nginx
      │
      ▼
Express
      │
      ▼
PostgreSQL
```

Nginx bertugas:

- Reverse Proxy
- SSL Termination
- Static File
- Compression

---

# Docker (Future)

Versi awal tidak mewajibkan Docker.

Namun struktur project telah dipersiapkan untuk deployment menggunakan Docker.

Contoh arsitektur:

```
Docker Compose

├── app

├── postgres

└── nginx
```

---

# Backup Strategy

Database perlu dibackup secara berkala.

Contoh:

```
Daily Backup

↓

Compressed SQL

↓

Cloud Storage
```

Untuk production, backup otomatis sangat disarankan.

---

# Monitoring

MVP menggunakan monitoring sederhana.

Pengembangan selanjutnya dapat menggunakan:

- Grafana
- Prometheus
- Uptime Kuma

---

# Security Considerations

Beberapa hal yang perlu diperhatikan saat deployment:

- HTTPS
- Firewall
- Environment Variables
- Database Authentication
- Rate Limiting
- Secure Headers
- CORS Configuration

---

# CI/CD (Future)

Pipeline sederhana.

```
Push

↓

GitHub Actions

↓

Build

↓

Test

↓

Deploy
```

Deployment otomatis dapat ditambahkan pada versi berikutnya.

---

# Deployment Checklist

Sebelum aplikasi dijalankan pada production:

- Node.js terpasang.
- PostgreSQL berjalan.
- Environment variables sudah diatur.
- Migration berhasil dijalankan.
- Build berhasil.
- HTTPS aktif.
- Backup database tersedia.

---

# Architecture Decisions

## Decision

Memisahkan konfigurasi deployment dari implementasi aplikasi.

## Why?

- Memudahkan deployment di berbagai lingkungan.
- Mengurangi perubahan kode saat berpindah dari development ke production.
- Mendukung otomatisasi deployment di masa depan.

## Trade-offs

- Membutuhkan konfigurasi environment yang lebih disiplin.
- Dokumentasi deployment menjadi lebih panjang.

---

# Future Improvements

Beberapa peningkatan yang dapat diterapkan:

- Docker
- Docker Compose
- Kubernetes
- GitHub Actions
- Blue-Green Deployment
- Rolling Update
- Horizontal Scaling
- Redis Cache
- Queue Worker
- Centralized Logging

---

# Conclusion

Deployment CI-CSMS dirancang sederhana namun tetap mengikuti praktik yang umum digunakan pada aplikasi backend modern. Dengan memisahkan konfigurasi environment, database, dan proses build, aplikasi dapat dijalankan secara konsisten baik di lingkungan development maupun production.
