# Cold Storage Monitoring System (CSMS)

🌐 **English** | [Bahasa Indonesia](./README.id.md)

A web-based cold storage monitoring system that tracks storage temperature in **real time**. It receives temperature readings from monitoring devices, stores the history in PostgreSQL, visualises it on a live dashboard, and sends notifications when temperatures leave their safe range.

> 🔧 The core features are complete and used in production. The project was rewritten as a **Turborepo monorepo** (NestJS + React/Vite), and is now in a phase of optimisation, testing and refinement.

---

## 🎯 Purpose

This project was built as part of a **Continuous Improvement (CI)** initiative in the **Warehouse** division, to replace the manual recording of cold storage temperatures.

- Eliminate manual temperature logging.
- Provide **real-time** temperature monitoring.
- Show temperature history as charts and reports.
- Raise early alerts when a temperature is outside its limits.
- Help analyse temperature deviations in a cold storage.
- Serve as an innovation entry for the company's **Continuous Improvement (CI)** competition.
- Stay flexible enough to be adopted by **other entities, branches and business units** with similar monitoring needs.

---

## ✨ Features

- Real-time monitoring dashboard (live status per device, sparkline, threshold bar)
- Master data management: Division → Location → Cold Storage → Device
- Per-device thresholds (`defrost`, `warning`, `critical`) and heartbeat interval
- Temperature history and reports, with **Excel export**
- Alert engine with states `NORMAL`, `DEFROST`, `WARNING`, `CRITICAL`, `OFFLINE`, plus alert acknowledgement
- Offline device detection (missed-heartbeat based, with a startup grace period)
- Monitoring pauses (`MAINTENANCE`, `MACHINE_OFF`) to silence alerts during planned work
- Device diagnostics (summary, daily, trend, detail)
- Notifications via **WhatsApp** (outbox pattern, persisted in the database)
- Notification recipients with subscription scopes: `ALL`, `DIVISION`, `LOCATION`, `COLD_STORAGE`, `DEVICE`
- Authentication & authorization with roles (`super_admin`, `admin`)
- User management
- Device API protected by an API key (`x-device-key`)
- Real-time updates via Server-Sent Events (SSE)

---

## 🧱 Tech Stack

| Layer    | Technology                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                                                              |
| Backend  | NestJS 11, TypeScript, PostgreSQL, Drizzle ORM, Better Auth, Zod, `@nestjs/schedule`, Baileys (WhatsApp), ExcelJS, Pino |
| Frontend | React 19, Vite, React Router, TanStack Query, TanStack Table, Tailwind CSS, shadcn/ui, Recharts, Sonner                 |
| Shared   | Types (`@workspace/shared`), Zod validators (`@workspace/validator`), UI kit (`@workspace/ui`)                          |
| Testing  | Jest, Supertest                                                                                                         |

### 🔄 What changed from v1

|              | v1                                 | v2 (current)                                |
| ------------ | ---------------------------------- | ------------------------------------------- |
| Architecture | Single app                         | Turborepo monorepo                          |
| Backend      | Express.js                         | NestJS                                      |
| Frontend     | EJS (server-rendered) + Vite       | React + Vite (SPA)                          |
| UI           | SAP UI5 Web Components, ApexCharts | Tailwind + shadcn/ui, Recharts              |
| Auth         | Custom                             | Better Auth                                 |
| Validation   | Per app                            | Shared Zod schemas                          |
| Device model | Free-text location                 | Division → Location → Cold Storage → Device |

---

## 📁 Project Structure

```text
csms/
├── apps/
│   ├── backend/        # NestJS API (REST + SSE, scheduler, WhatsApp)
│   │   ├── src/        # modules: device, temperature, alert, notification, ...
│   │   ├── drizzle/    # SQL migrations
│   │   ├── script/     # fake_telemetry.ts (device simulator)
│   │   └── test/       # e2e tests
│   └── web/            # React + Vite dashboard
├── packages/
│   ├── shared/         # shared TypeScript types
│   ├── validator/      # shared Zod schemas
│   └── ui/             # shared shadcn/ui components
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 20.19`
- pnpm
- PostgreSQL

### Install

```bash
git clone https://github.com/febriarr/csms.git
cd csms
pnpm install
```

### Environment

Create `apps/backend/.env`:

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms
DB_SSL=false
# Optional tuning (defaults shown)
# DB_POOL_MAX=10
# DB_POOL_IDLE_TIMEOUT_MS=30000
# DB_POOL_CONNECTION_TIMEOUT_MS=5000
# DB_POOL_MAX_LIFETIME_SECONDS=1800
# DB_STATEMENT_TIMEOUT_MS=30000
# DB_IDLE_IN_TX_TIMEOUT_MS=15000

# Web & Auth
WEB_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=change-me-to-a-random-string-of-32+-chars
AUTH_COOKIE_DOMAIN=

# Devices
DEVICE_API_KEY=change-me-min-16-chars

# WhatsApp (optional)
WHATSAPP_ENABLED=false
WHATSAPP_AUTH_DIR=.baileys_auth

# Seed
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

> ⚠️ Never commit `.env` files. Use strong, unique values for `BETTER_AUTH_SECRET` and `DEVICE_API_KEY` in production.

### Database

Run from the repo root with `pnpm --filter backend <script>`:

```bash
pnpm --filter backend db:generate   # generate migration
pnpm --filter backend db:migrate    # run migrations
pnpm --filter backend db:push       # push schema directly (dev)
pnpm --filter backend db:studio     # open Drizzle Studio
pnpm --filter backend db:seed       # seed the super admin user
```

The seeded super admin is `admin@csms.local`, with the password from `SEED_ADMIN_PASSWORD`. **Change it after the first login.**

---

## ▶️ Running

```bash
# Development (all apps)
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

In development the backend also starts a **fake telemetry** simulator (`apps/backend/script/fake_telemetry.ts`) that posts readings for sample devices every 30 seconds, so the dashboard has live data without hardware.

---

## 📡 Sending Temperature Data

Devices post readings to `POST /api/temperature` with the `x-device-key` header set to `DEVICE_API_KEY`. Duplicate retries are treated as success.

Temperature state is derived from the device thresholds:

| State      | Rule (with defrost)          | Rule (without defrost)    |
| ---------- | ---------------------------- | ------------------------- |
| `NORMAL`   | `t <= defrost`               | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`      | –                         |
| `WARNING`  | `warning <= t < critical`    | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`              | `t >= critical`           |
| `OFFLINE`  | no heartbeat for 5 intervals | same                      |

---

## 🧪 Testing

```bash
pnpm --filter backend test        # unit tests
pnpm --filter backend test:cov    # coverage
pnpm --filter backend test:e2e    # e2e tests
```

---

## 📌 Roadmap

### Foundation

- [x] Monorepo (Turborepo + pnpm)
- [x] NestJS backend, React + Vite frontend
- [x] Shared types, validators and UI packages
- [x] PostgreSQL + Drizzle ORM, migrations and seeders

### Monitoring

- [x] Master data (Division, Location, Cold Storage, Device)
- [x] Temperature ingestion and history
- [x] Alert engine and acknowledgement
- [x] Offline detection
- [x] Monitoring pauses
- [x] Diagnostics
- [x] Excel report export

### Realtime & Notifications

- [x] Server-Sent Events (SSE) live dashboard
- [x] WhatsApp notification
- [ ] Email notification (schema and recipients ready, sender not yet implemented)

### Planned

- [ ] **MQTT** – ingest telemetry from devices over MQTT
- [ ] **Redis** – caching, pub/sub and a job queue
- [ ] **WebSocket** – replace SSE for real-time updates
- [ ] **Multi-tenancy** – isolate data per entity, branch or business unit
- [ ] **Operational features** – additional features tailored to day-to-day operations

---

## 📖 License

This project is licensed under the **MIT License**.
