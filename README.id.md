# Cold Storage Monitoring System (CSMS)

🌐 [English](./README.md) | **Bahasa Indonesia**

Sistem monitoring cold storage berbasis web untuk memantau suhu penyimpanan secara **real-time**. Aplikasi ini menerima data suhu dari perangkat monitoring, menyimpan riwayatnya ke PostgreSQL, menampilkan visualisasi pada dashboard langsung, serta mengirim notifikasi ketika suhu melewati batas aman.

> 🔧 Fitur utama telah selesai dan digunakan di production. Project ini telah di-rewrite menjadi **monorepo Turborepo** (NestJS + React/Vite), dan saat ini berada pada tahap optimasi, pengujian, dan penyempurnaan.

---

## 🎯 Tujuan

Project ini dikembangkan sebagai bagian dari inisiatif **Continuous Improvement (CI)** di divisi **Warehouse** untuk menggantikan pencatatan suhu cold storage yang sebelumnya dilakukan secara manual.

- Mengurangi pencatatan suhu secara manual.
- Menyediakan monitoring suhu secara **real-time**.
- Menampilkan riwayat suhu dalam bentuk grafik dan laporan.
- Memberikan peringatan dini (alert) ketika suhu di luar batas.
- Membantu analisis apabila terjadi penyimpangan suhu pada cold storage.
- Menjadi inovasi yang dapat diikutsertakan dalam kompetisi **Continuous Improvement (CI)** perusahaan.
- Dirancang fleksibel agar dapat diadaptasi oleh **entitas, cabang, maupun unit bisnis lain** dengan kebutuhan serupa.

---

## ✨ Fitur

- Dashboard monitoring real-time (status live per device, sparkline, threshold bar)
- Manajemen master data: Division → Location → Cold Storage → Device
- Threshold per device (`defrost`, `warning`, `critical`) dan interval heartbeat
- Riwayat dan laporan suhu, dengan **export Excel**
- Alert engine dengan status `NORMAL`, `DEFROST`, `WARNING`, `CRITICAL`, `OFFLINE`, serta acknowledge alert
- Deteksi device offline (berdasarkan heartbeat yang terlewat, dengan grace period saat startup)
- Monitoring pause (`MAINTENANCE`, `MACHINE_OFF`) untuk menonaktifkan alert saat pekerjaan terencana
- Diagnostik device (ringkasan, harian, tren, detail)
- Notifikasi via **WhatsApp** (pola outbox, tersimpan di database)
- Penerima notifikasi dengan scope langganan: `ALL`, `DIVISION`, `LOCATION`, `COLD_STORAGE`, `DEVICE`
- Authentication & authorization dengan role (`super_admin`, `admin`)
- Manajemen pengguna
- Device API diamankan dengan API key (`x-device-key`)
- Update real-time menggunakan Server-Sent Events (SSE)

---

## 🧱 Teknologi yang Digunakan

| Layer    | Teknologi                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                                                              |
| Backend  | NestJS 11, TypeScript, PostgreSQL, Drizzle ORM, Better Auth, Zod, `@nestjs/schedule`, Baileys (WhatsApp), ExcelJS, Pino |
| Frontend | React 19, Vite, React Router, TanStack Query, TanStack Table, Tailwind CSS, shadcn/ui, Recharts, Sonner                 |
| Shared   | Types (`@workspace/shared`), validator Zod (`@workspace/validator`), UI kit (`@workspace/ui`)                           |
| Testing  | Jest, Supertest                                                                                                         |

### 🔄 Perubahan dari v1

|              | v1                                 | v2 (saat ini)                               |
| ------------ | ---------------------------------- | ------------------------------------------- |
| Arsitektur   | Aplikasi tunggal                   | Monorepo Turborepo                          |
| Backend      | Express.js                         | NestJS                                      |
| Frontend     | EJS (server-rendered) + Vite       | React + Vite (SPA)                          |
| UI           | SAP UI5 Web Components, ApexCharts | Tailwind + shadcn/ui, Recharts              |
| Auth         | Custom                             | Better Auth                                 |
| Validasi     | Per aplikasi                       | Skema Zod bersama                           |
| Model device | Lokasi teks bebas                  | Division → Location → Cold Storage → Device |

---

## 📁 Struktur Project

```text
csms/
├── apps/
│   ├── backend/        # NestJS API (REST + SSE, scheduler, WhatsApp)
│   │   ├── src/        # modul: device, temperature, alert, notification, ...
│   │   ├── drizzle/    # migrasi SQL
│   │   ├── script/     # fake_telemetry.ts (simulator device)
│   │   └── test/       # e2e test
│   └── web/            # Dashboard React + Vite
├── packages/
│   ├── shared/         # tipe TypeScript bersama
│   ├── validator/      # skema Zod bersama
│   └── ui/             # komponen shadcn/ui bersama
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 🚀 Memulai

### Prasyarat

- Node.js `>= 20.19`
- pnpm
- PostgreSQL

### Instalasi

```bash
git clone https://github.com/febriarr/csms.git
cd csms
pnpm install
```

### Konfigurasi Environment

Buat `apps/backend/.env`:

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms
DB_SSL=false
# Opsional (nilai default ditampilkan)
# DB_POOL_MAX=10
# DB_POOL_IDLE_TIMEOUT_MS=30000
# DB_POOL_CONNECTION_TIMEOUT_MS=5000
# DB_POOL_MAX_LIFETIME_SECONDS=1800
# DB_STATEMENT_TIMEOUT_MS=30000
# DB_IDLE_IN_TX_TIMEOUT_MS=15000

# Web & Auth
WEB_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=ganti-dengan-string-acak-minimal-32-karakter
AUTH_COOKIE_DOMAIN=

# Device
DEVICE_API_KEY=ganti-minimal-16-karakter

# WhatsApp (opsional)
WHATSAPP_ENABLED=false
WHATSAPP_AUTH_DIR=.baileys_auth

# Seed
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Buat `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

> ⚠️ Jangan pernah commit file `.env`. Gunakan nilai yang kuat dan unik untuk `BETTER_AUTH_SECRET` dan `DEVICE_API_KEY` di production.

### Database

Jalankan dari root repo dengan `pnpm --filter backend <script>`:

```bash
pnpm --filter backend db:generate   # generate migration
pnpm --filter backend db:migrate    # jalankan migration
pnpm --filter backend db:push       # push schema langsung (dev)
pnpm --filter backend db:studio     # buka Drizzle Studio
pnpm --filter backend db:seed       # seed user super admin
```

Super admin hasil seed adalah `admin@csms.local` dengan password dari `SEED_ADMIN_PASSWORD`. **Segera ganti setelah login pertama.**

---

## ▶️ Menjalankan Project

```bash
# Development (semua app)
pnpm dev

# Build
pnpm build

# Lint / format / typecheck
pnpm lint
pnpm format
pnpm typecheck

# Production (backend)
pnpm --filter backend start:prod
```

Pada mode development, backend juga menjalankan simulator **fake telemetry** (`apps/backend/script/fake_telemetry.ts`) yang mengirim data untuk device contoh setiap 30 detik, sehingga dashboard memiliki data live tanpa perangkat fisik.

---

## 📡 Mengirim Data Suhu

Device mengirim data ke `POST /api/temperature` dengan header `x-device-key` berisi `DEVICE_API_KEY`. Pengiriman ulang (retry) yang duplikat dianggap berhasil.

Status suhu ditentukan dari threshold device:

| Status     | Aturan (dengan defrost)               | Aturan (tanpa defrost)    |
| ---------- | ------------------------------------- | ------------------------- |
| `NORMAL`   | `t <= defrost`                        | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`               | –                         |
| `WARNING`  | `warning <= t < critical`             | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`                       | `t >= critical`           |
| `OFFLINE`  | tidak ada heartbeat selama 5 interval | sama                      |

---

## 🧪 Test

```bash
pnpm --filter backend test        # unit test
pnpm --filter backend test:cov    # coverage
pnpm --filter backend test:e2e    # e2e test
```

---

## 📌 Roadmap

### Fondasi

- [x] Monorepo (Turborepo + pnpm)
- [x] Backend NestJS, frontend React + Vite
- [x] Package shared, validator, dan UI
- [x] PostgreSQL + Drizzle ORM, migration, dan seeder

### Monitoring

- [x] Master data (Division, Location, Cold Storage, Device)
- [x] Penerimaan data suhu dan riwayat
- [x] Alert engine dan acknowledge
- [x] Deteksi device offline
- [x] Monitoring pause
- [x] Diagnostik
- [x] Export laporan Excel

### Realtime & Notifikasi

- [x] Dashboard live dengan Server-Sent Events (SSE)
- [x] Notifikasi WhatsApp
- [ ] Notifikasi Email (schema dan penerima sudah siap, pengirim belum diimplementasikan)

### Rencana Pengembangan

- [ ] **MQTT** – menerima telemetry dari device melalui MQTT
- [ ] **Redis** – caching, pub/sub, dan job queue
- [ ] **WebSocket** – menggantikan SSE untuk update real-time
- [ ] **Multi-tenancy** – isolasi data per entitas, cabang, atau unit bisnis
- [ ] **Fitur operasional** – penambahan fitur untuk menyesuaikan kebutuhan operasional

---

## 📖 Lisensi

Project ini menggunakan lisensi **MIT License**.
