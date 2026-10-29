# CSMS (Cold Storage Monitoring System)

[English](./README.md) | Bahasa Indonesia

CSMS memantau suhu cold storage. Perangkat mengirim data ke API, data disimpan di PostgreSQL, dan dashboard web menampilkan kondisi terkini setiap device. Kalau suhu melewati batas, atau device berhenti mengirim data, sistem membuat alert dan mengirim notifikasi WhatsApp.

Project ini berawal dari inisiatif Continuous Improvement di divisi Warehouse untuk menggantikan pencatatan suhu manual. Fitur utamanya sudah dipakai di production. Pekerjaan saat ini difokuskan pada optimasi dan pengujian.

## Fitur

- Dashboard live: kondisi tiap device, sparkline, dan threshold bar
- Master data: Division, Location, Cold Storage, dan Device
- Threshold per device (`defrost`, `warning`, `critical`) dan interval heartbeat yang bisa diatur
- Alert dengan acknowledge, serta deteksi device offline
- Monitoring pause (`MAINTENANCE`, `MACHINE_OFF`) agar pekerjaan terencana tidak memicu alert
- Riwayat suhu, diagnostik device, dan export laporan Excel
- Notifikasi WhatsApp. Penerima berlangganan berdasarkan scope: semua, division, location, cold storage, atau device
- Login dengan role (`super_admin`, `admin`) dan manajemen pengguna
- Endpoint device diamankan dengan API key
- Update live lewat Server-Sent Events (SSE)

## Teknologi

| Area     | Stack                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                                |
| Backend  | NestJS 11, PostgreSQL, Drizzle ORM, Better Auth, Zod, Baileys (WhatsApp), ExcelJS, Pino   |
| Frontend | React 19, Vite, React Router, TanStack Query dan Table, Tailwind CSS, shadcn/ui, Recharts |
| Testing  | Jest, Supertest                                                                           |

## Struktur project

```text
csms/
├── apps/
│   ├── backend/      API NestJS, scheduler, WhatsApp, migrasi, simulator device
│   └── web/          Dashboard React + Vite
└── packages/
    ├── shared/       Tipe TypeScript yang dipakai kedua app
    ├── validator/    Skema Zod yang dipakai kedua app
    └── ui/           Komponen shadcn/ui
```

## Memulai

Butuh Node.js 20.19 atau lebih baru, pnpm, dan database PostgreSQL.

```bash
git clone https://github.com/febriarr/csms.git
cd csms
pnpm install
```

### Environment

Buat `apps/backend/.env`:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms
DB_SSL=false

WEB_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=ganti-minimal-32-karakter-acak-ya
AUTH_COOKIE_DOMAIN=

DEVICE_API_KEY=ganti-minimal-16-karakter

WHATSAPP_ENABLED=false
WHATSAPP_AUTH_DIR=.baileys_auth

SEED_ADMIN_PASSWORD=ChangeMe123!
```

Variabel `DB_POOL_*`, `DB_STATEMENT_TIMEOUT_MS`, dan `DB_IDLE_IN_TX_TIMEOUT_MS` bersifat opsional dan punya nilai default. Lihat `apps/backend/src/config/env.validation.ts`.

Buat `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

File `.env` sudah di-ignore git. Gunakan secret sendiri di production.

### Database

```bash
pnpm --filter backend db:migrate   # jalankan migrasi
pnpm --filter backend db:seed      # buat super admin
```

Seed membuat `admin@csms.local` dengan password dari `SEED_ADMIN_PASSWORD`. Ganti setelah login pertama.

Script lain: `db:generate` (migrasi baru), `db:push` (push schema langsung, hanya untuk dev), dan `db:studio` (Drizzle Studio).

### Menjalankan

```bash
pnpm dev
```

API berjalan di `http://localhost:3000` dan dashboard di `http://localhost:5173`. Di mode development, backend juga menjalankan `script/fake_telemetry.ts` yang mengirim data untuk 11 device simulasi setiap 30 detik, jadi dashboard tetap berisi data tanpa perangkat fisik. Seed tidak membuat device. Tambahkan device lewat dashboard (Settings, Master Data) dengan kode yang tertera di script itu, misalnya `1011` dan `1012`, kalau tidak data akan ditolak.

Perintah lain: `pnpm build`, `pnpm lint`, `pnpm typecheck`, dan `pnpm --filter backend start:prod`.

### WhatsApp

Set `WHATSAPP_ENABLED=true`, jalankan backend, lalu buka dialog WhatsApp di dashboard dan scan QR code untuk menautkan akun. Sesinya disimpan di `WHATSAPP_AUTH_DIR`.

## Mengirim data suhu

Device mengirim data ke `POST /api/temperature` dengan header `x-device-key: <DEVICE_API_KEY>`. Request yang sama yang dikirim ulang dianggap berhasil, jadi device aman untuk melakukan retry.

Status dihitung dari threshold device tersebut:

| Status     | Dengan defrost                 | Tanpa defrost             |
| ---------- | ------------------------------ | ------------------------- |
| `NORMAL`   | `t <= defrost`                 | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`        | tidak dipakai             |
| `WARNING`  | `warning <= t < critical`      | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`                | `t >= critical`           |
| `OFFLINE`  | tidak ada heartbeat 5 interval | sama                      |

Deteksi offline berjalan setiap 30 detik. Setelah API menyala, deteksi menunggu 2 menit supaya restart tidak membanjiri orang dengan pesan offline palsu.

## Testing

```bash
pnpm --filter backend test
pnpm --filter backend test:cov
pnpm --filter backend test:e2e
```

## Roadmap

Selesai:

- [x] Rewrite monorepo dengan NestJS dan React + Vite
- [x] Alert, deteksi offline, dan monitoring pause
- [x] Export laporan Excel
- [x] Notifikasi WhatsApp
- [x] Dashboard live dengan SSE

Berikutnya:

- [ ] Notifikasi email (schema dan penerima sudah ada, pengirimnya belum)
- [ ] MQTT untuk menerima telemetry dari device
- [ ] Redis untuk caching dan pub/sub
- [ ] WebSocket untuk menggantikan SSE
- [ ] Multi-tenancy, agar entitas dan cabang lain bisa memakai satu deployment
- [ ] Fitur tambahan sesuai kebutuhan operasional harian

## Lisensi

MIT. Copyright (c) 2026 Febri Ardiansyah.
