# CSMS (Cold Storage Monitoring System)

English | [Bahasa Indonesia](./README.id.md)

CSMS monitors cold storage temperatures. Devices send readings to the API, the readings are stored in PostgreSQL, and the web dashboard shows the current state of every device. When a temperature crosses its limit, or a device stops reporting, the system raises an alert and sends a WhatsApp notification.

It started as a Continuous Improvement project in the Warehouse division, to replace manual temperature logging. The main features are in use in production. Current work is on optimisation and testing.

## Features

- Live dashboard with the state of each device, a sparkline and a threshold bar
- Master data: Division, Location, Cold Storage and Device
- Thresholds per device (`defrost`, `warning`, `critical`) and a configurable heartbeat interval
- Alerts with acknowledgement, plus offline detection
- Monitoring pauses (`MAINTENANCE`, `MACHINE_OFF`) so planned work does not trigger alerts
- Temperature history, device diagnostics and Excel report export
- WhatsApp notifications. Recipients subscribe by scope: all, division, location, cold storage or device
- Login with roles (`super_admin`, `admin`) and user management
- Device endpoint protected by an API key
- Live updates over Server-Sent Events (SSE)

## Tech stack

| Area     | Stack                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                                |
| Backend  | NestJS 11, PostgreSQL, Drizzle ORM, Better Auth, Zod, Baileys (WhatsApp), ExcelJS, Pino   |
| Frontend | React 19, Vite, React Router, TanStack Query and Table, Tailwind CSS, shadcn/ui, Recharts |
| Testing  | Jest, Supertest                                                                           |

## Project structure

```text
csms/
├── apps/
│   ├── backend/      NestJS API, scheduler, WhatsApp, migrations, device simulator
│   └── web/          React + Vite dashboard
└── packages/
    ├── shared/       TypeScript types used by both apps
    ├── validator/    Zod schemas used by both apps
    └── ui/           shadcn/ui components
```

## Getting started

You need Node.js 20.19 or newer, pnpm and a PostgreSQL database.

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

DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms
DB_SSL=false

WEB_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=change-me-at-least-32-characters-long
AUTH_COOKIE_DOMAIN=

DEVICE_API_KEY=change-me-at-least-16-chars

WHATSAPP_ENABLED=false
WHATSAPP_AUTH_DIR=.baileys_auth

SEED_ADMIN_PASSWORD=ChangeMe123!
```

The `DB_POOL_*`, `DB_STATEMENT_TIMEOUT_MS` and `DB_IDLE_IN_TX_TIMEOUT_MS` variables are optional and have defaults. See `apps/backend/src/config/env.validation.ts`.

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

`.env` files are git-ignored. Use your own secrets in production.

### Database

```bash
pnpm --filter backend db:migrate   # apply migrations
pnpm --filter backend db:seed      # create the super admin
```

The seed creates `admin@csms.local` with the password from `SEED_ADMIN_PASSWORD`. Change it after the first login.

Other scripts: `db:generate` (new migration), `db:push` (push the schema directly, dev only) and `db:studio` (Drizzle Studio).

### Run

```bash
pnpm dev
```

The API runs on `http://localhost:3000` and the dashboard on `http://localhost:5173`. In development the backend also starts `script/fake_telemetry.ts`, which sends readings for 11 simulated devices every 30 seconds, so the dashboard has data without any hardware. The seed does not create devices. Add devices in the dashboard (Settings, Master Data) using the codes listed in that script, such as `1011` and `1012`, or the readings are rejected.

Other commands: `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm --filter backend start:prod`.

### WhatsApp

Set `WHATSAPP_ENABLED=true`, start the backend and open the WhatsApp dialog in the dashboard to link an account by scanning the QR code. The session is kept in `WHATSAPP_AUTH_DIR`.

## Sending temperature data

A device posts a reading to `POST /api/temperature` with the header `x-device-key: <DEVICE_API_KEY>`. A repeated request for the same reading is treated as a success, so devices can safely retry.

The state is worked out from the thresholds of that device:

| State      | With defrost                 | Without defrost           |
| ---------- | ---------------------------- | ------------------------- |
| `NORMAL`   | `t <= defrost`               | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`      | not used                  |
| `WARNING`  | `warning <= t < critical`    | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`              | `t >= critical`           |
| `OFFLINE`  | no heartbeat for 5 intervals | same                      |

Offline detection runs every 30 seconds. It waits 2 minutes after the API starts, so a restart does not flood people with false offline messages.

## How it works

```mermaid
flowchart LR
    D["Device"] -->|"POST /api/temperature"| API["API"]

    subgraph TX["One database transaction"]
        API --> R["Store reading"]
        R --> S{"State changed?"}
        S -->|"yes"| A["Record alert"]
        A --> O["Queue messages (outbox)"]
    end

    API -->|"after commit"| E["SSE event"] --> UI["Dashboard"]
    O --> W["Dispatcher"] --> WA["WhatsApp"]
    J["Offline job, every 30 s"] --> A
```

1. The API locks the device row, so two readings from one device are handled one after the other.
2. The reading is always stored, even during a monitoring pause, because it is audit data. A retry of the same reading stops here as a duplicate.
3. A late reading (older than the newest one) is kept as history and changes nothing else.
4. If the device is active and no pause is suppressing alerts, the new state is compared with the stored one. Only a change creates an alert.
5. The alert and its notification messages are saved in the same transaction, so an alert cannot exist without its messages. Messages are queued for `WARNING`, `CRITICAL` and offline alerts, one per subscribed recipient.
6. After the commit, the new state is pushed to the dashboard over SSE. Nothing is published for a transaction that rolled back.
7. The dispatcher picks up pending messages and sends them through WhatsApp. A failed message is retried up to 5 times (after 0, 30, 120, 300 and 600 seconds), and a message still pending after 60 minutes is marked failed.

A pause stops temperature alerts but not offline detection. A device that goes silent during a pause is still reported, because that means a real fault such as a lost cable or network.

The dispatcher and the SSE stream both live inside one API process. Run a single instance for now. Running several needs row locking for the dispatcher and Redis for the live events, which is why both are on the roadmap.

## Testing

```bash
pnpm --filter backend test
pnpm --filter backend test:cov
pnpm --filter backend test:e2e
```

## Roadmap

Done:

- [x] Monorepo rewrite with NestJS and React + Vite
- [x] Alerts, offline detection and monitoring pauses
- [x] Excel report export
- [x] WhatsApp notifications
- [x] SSE live dashboard

Next:

- [ ] Email notifications (the schema and recipients exist, the sender does not)
- [ ] MQTT for device telemetry ingestion
- [ ] Remote device management, including firmware updates and maintenance controls
- [ ] Multi-tenancy and multi-instance deployment
- [ ] Redis for cross-instance event distribution and caching
- [ ] Evaluate WebSocket if bidirectional realtime communication is needed
- [ ] More features driven by day-to-day operations

## License

MIT. Copyright (c) 2026 Febri Ardiansyah.
