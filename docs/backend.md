<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Backend

> Bahasa Indonesia: [backend.id.md](backend.id.md) · Frontend: [frontend.md](frontend.md)

The backend lives in `apps/backend`. It is a NestJS 11 API on PostgreSQL (Drizzle ORM) with Better Auth for sign-in. Everything is served under the `/api` prefix.

This document explains how a reading travels through the system, why it is built that way, which endpoints exist, how to add a feature, and how to run it.

- [1. Data flow](#1-data-flow)
- [2. Design decisions](#2-design-decisions)
- [3. API reference](#3-api-reference)
- [4. Conventions and adding a feature](#4-conventions-and-adding-a-feature)
- [5. Operations](#5-operations)

## 1. Data flow

### Ingest

A device posts to `POST /api/temperature` with the header `x-device-key`.

```json
{
    "deviceCode": "1011",
    "timestamp": "2026-10-31T12:00:00+07:00",
    "temperature": -18.4,
    "sensorFailCount": 0,
    "wifiFailCount": 0,
    "httpFailCount": 0,
    "rssi": -61
}
```

`reason` (reset report: `BROWNOUT`, `PANIC`, `WATCHDOG`, `UNKNOWN` plus counters) is optional. A timestamp more than 5 minutes ahead of the server or more than 30 days old is rejected (`MAX_CLOCK_AHEAD_MS`, `MAX_READING_AGE_MS` in `packages/validator/src/temperature.validator.ts`).

`TemperatureService.ingest` then does this in **one transaction**:

1. Lock the device row (`findByCodeForUpdate`). Two readings from one device are processed one after the other.
2. Insert the reading. The primary key of `temperature_logs` is `(device_id, recorded_at)`, so a retry of the same reading hits a conflict and is acknowledged as a duplicate. Nothing else happens for a duplicate.
3. Store, together with the reading, a snapshot of the device `state`, an `evaluation` and a `pause_id`.
4. If the reading is older than the newest one (`LATE_ARRIVAL`) or monitoring is off for the device (`DEVICE_INACTIVE`), stop: it is history only.
5. If a pause suppresses alerts (`PAUSED`, or `PULLING_DOWN` after the pause), stop: the reading is stored, no alert is made.
6. Otherwise classify the temperature. If the state differs from the stored one: write an `alerts` row, update the device state, and (for `WARNING`, `CRITICAL`, offline) queue one `notification_logs` row per subscribed recipient.

After the commit, the new device state is published to the SSE stream. A rolled-back transaction publishes nothing. A reading for an unknown device code is a 404.

### Classification

| State      | With `defrost` threshold  | Without                   |
| ---------- | ------------------------- | ------------------------- |
| `NORMAL`   | `t <= defrost`            | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`   | not used                  |
| `WARNING`  | `warning <= t < critical` | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`           | `t >= critical`           |

`OFFLINE` is not a classification of a reading. It is set by the offline job (below).

### `evaluation` values

Stored on every reading, so a report can explain "above the threshold but no alert":

| Value             | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `EVALUATED`       | Went through the normal state and alert rules            |
| `PAUSED`          | A planned pause was running                              |
| `PULLING_DOWN`    | The pause ended and the machine is still allowed to cool |
| `DEVICE_INACTIVE` | Monitoring is switched off for the device                |
| `LATE_ARRIVAL`    | Older than the device's newest reading                   |

### Pauses

A monitoring pause targets exactly one device or one cold storage. `kind` is `MAINTENANCE` or `MACHINE_OFF`. `endsAt` null means "until further notice". `maxPulldownMinutes` (0 to 1440) keeps alerts suppressed after the pause ended, unless the device already read below its warning threshold since then. A pause never stops offline detection.

### Offline detection

`DeviceOfflineService` runs every 30 seconds. A device is stale when `now - lastSeenAt > heartbeatIntervalSeconds * 5`. A device that never sent anything is not stale. After the API starts the job waits 2 minutes, so a restart does not produce false offline alerts. An overlap flag prevents two runs at once.

### Notifications (outbox)

The alert and its messages are written in the same transaction as the reading, so an alert cannot exist without its messages. A dispatcher reads pending rows in batches of 20 (`DISPATCH_BATCH_SIZE`) and sends them with WhatsApp (Baileys). A failed message is retried up to 5 times, after 0, 30, 120, 300 and 600 seconds. A message still pending after 60 minutes (`MAX_MESSAGE_AGE_MINUTES`) is marked `FAILED`. The `EMAIL` channel exists in the schema; there is no sender yet.

### Retention

`TemperatureRetentionService` runs daily at 03:00 Asia/Jakarta and deletes `temperature_logs` older than 5 years, per device, in batches of 5000. A failure for one device is logged and the next device continues. Only `temperature_logs` has retention. `alerts`, `device_diagnostics_logs` and `notification_logs` grow without limit.

## 2. Design decisions

**One transaction, one locked row.** Without the lock, two concurrent readings can both see the old state and both create an alert. The cost is that one device's readings are serialised. That is fine at 30-second intervals.

**Always store the reading.** A reading during a pause is audit data. The `evaluation` column records why no alert came, so a report is never ambiguous.

**Outbox instead of sending inside the request.** Sending WhatsApp inside the ingest request would make a device's request depend on WhatsApp being up. The outbox row commits with the alert; the dispatcher retries independently.

**SSE publishes after commit.** The live page must not show a state the database does not have.

**Offline is not suppressed by pauses.** A cable pulled out during maintenance is a real fault.

**Device authentication is separate from user authentication.** Devices have no session. `DeviceKeyGuard` compares `x-device-key` with `DEVICE_API_KEY` using `timingSafeEqual`. The route uses `@AllowAnonymous()` to skip the session guard and `@SkipThrottle()` so devices behind one gateway are not cut off.

**Validation lives in `packages/validator`.** The same Zod schema validates the form in the browser and the request in the API. Device-facing schemas (`telemetrySchema`) stay in the backend because the browser never needs them.

**One error shape.** Every failure goes through `AllExceptionsFilter` and `mapException` and comes out as `ErrorResponse`. The web app switches on `code`, never on the message text.

**Single instance.** The dispatcher and the SSE stream live in the API process. Running two instances would send messages twice and split live events. Running several needs row locking for the dispatcher and a shared bus (Redis) for events.

**Time zone.** `Asia/Jakarta` (`common/utils/app_timezone.ts`) for cron jobs and report day boundaries. Timestamps are stored as `timestamptz`.

## 3. API reference

All paths are under `/api`. All routes require a signed-in user unless marked otherwise. Only the routes marked `super_admin` check the role. `admin` is the default role.

### Response envelope

Success: `{ "success": true, "data": ..., "metadata"?: ... }`. `metadata` is present on paginated lists (`PaginationMeta`). Default page size 20, maximum 100 (`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`).

Failure:

```json
{
    "success": false,
    "statusCode": 409,
    "code": "DEVICE_CODE_TAKEN",
    "message": "...",
    "errors": { "code": ["..."] },
    "timestamp": "2026-10-31T05:00:00.000Z",
    "path": "/api/device"
}
```

`errors` maps field name to messages; `_root` holds messages without a field. `debug` is added for 5xx outside production only. User-facing messages are in Indonesian.

Routes that skip the envelope (`@SkipTransform()`): `GET /events/device-status`, `GET /temperature/report/export`, `GET /health`.

### Error codes

The values are part of the contract; add new ones, never rename (`packages/shared/src/types/api.type.ts`).

Generic: `VALIDATION_FAILED`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `ENTITY_NOT_FOUND`, `CONFLICT`, `DUPLICATE_ENTITY`, `RESOURCE_IN_USE`, `REFERENCE_NOT_FOUND`, `BUSINESS_RULE_VIOLATION`, `CONCURRENT_UPDATE`, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

Specific ones come from database constraints (`common/exception/db_constraints.ts`), for example `DEVICE_CODE_TAKEN`, `DEVICE_POINT_TAKEN`, `COLD_STORAGE_NAME_TAKEN`, `DIVISION_NAME_TAKEN`, `LOCATION_NAME_TAKEN`, `RECIPIENT_TARGET_TAKEN`, `SUBSCRIPTION_DUPLICATE`, `INVALID_THRESHOLD_ORDER`, `INVALID_PAUSE_TARGET`, `INVALID_PAUSE_RANGE`, `INVALID_SUBSCRIPTION_SCOPE`, `EMAIL_TAKEN`.

Status mapping: `EntityNotFoundException` 404, `DuplicateEntityException` and `ResourceInUseException` 409, `BusinessRuleException` 422, validation 400, rate limit 429, database unreachable 503.

### Endpoints

| Method             | Path                                                                 | Notes                                                                                                 |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST               | `/auth/sign-in/username` and other `/auth/*`                         | Better Auth. No public sign-up. Cookie prefix `csms`. Login attempts are rate limited                 |
| POST               | `/temperature`                                                       | Device ingest. Header `x-device-key`. No session. Not throttled. 201                                  |
| GET                | `/temperature/recent`                                                | Latest readings for sparklines. `deviceIds` is a comma-separated list                                 |
| GET                | `/temperature/report`                                                | Raw readings, paged. `deviceId?`, `from?`, `to?`, `page`, `pageSize` (default 50, max 100)            |
| GET                | `/temperature/report/events`                                         | Alerts and pauses of a period. `deviceId`, `from`, `to` required                                      |
| GET                | `/temperature/report/summary`                                        | Readings per state and per `evaluation`. Same query                                                   |
| GET                | `/temperature/report/hourly`                                         | One row per hour (min, avg, max, worst state, coverage). Same query. At most 744 rows                 |
| GET                | `/temperature/report/export`                                         | File download. `deviceId`, `from`, `to`, `format=xlsx\|csv`, `granularity=raw\|hourly`                |
| GET                | `/overview`                                                          | Everything the Overview page needs, in one call                                                       |
| GET                | `/alert`                                                             | Paged. `deviceId`, `coldStorageId`, `toState`, `reasonCode`, `acknowledged=true\|false`, `from`, `to` |
| PATCH              | `/alert/:id/acknowledge`                                             | No body. The user comes from the session                                                              |
| GET, POST          | `/monitoring-pause`                                                  | List (`deviceId?`, `coldStorageId?`) and create                                                       |
| PATCH              | `/monitoring-pause/:id/end`                                          | Body `endsAt?`, `note?`. 422 if it already ended                                                      |
| DELETE             | `/monitoring-pause/:id`                                              |                                                                                                       |
| GET, POST          | `/division`, `/location`, `/cold-storage`, `/device`                 | Master data. 201 on create                                                                            |
| GET                | `/device/:id`                                                        |                                                                                                       |
| PATCH, DELETE      | `/division/:id`, `/location/:id`, `/cold-storage/:id`, `/device/:id` | DELETE is 204; 409 `RESOURCE_IN_USE` when rows depend on it                                           |
| GET, POST          | `/notification-recipients`                                           |                                                                                                       |
| GET, PATCH, DELETE | `/notification-recipients/:id`                                       |                                                                                                       |
| PUT                | `/notification-recipients/:id/subscriptions`                         | Replaces the subscriptions. Scope: `ALL`, `DIVISION`, `LOCATION`, `COLD_STORAGE`, `DEVICE`            |
| GET                | `/notification-log`                                                  | Paged. `deviceId`, `coldStorageId`, `channel`, `status`, `search`, `from`, `to`                       |
| GET                | `/diagnostic/summary`, `/today`, `/trend`, `/detail`                 | Device health from the diagnostic counters (`detail` is paged and needs `deviceId`)                   |
| GET                | `/events/device-status`                                              | SSE stream of device state changes                                                                    |
| GET                | `/whatsapp/status`                                                   | `super_admin`. Link status for the WhatsApp dialog                                                    |
| PATCH              | `/user/me`, `/user/me/password`                                      | Any signed-in user, own account                                                                       |
| GET, POST          | `/user`                                                              | `POST` is `super_admin`                                                                               |
| PATCH              | `/user/:id`, `/user/:id/role`                                        | `super_admin`                                                                                         |
| DELETE             | `/user/:id`                                                          | `super_admin`                                                                                         |
| GET                | `/health`                                                            | No session, not throttled, no envelope. See [Health](#health)                                         |

Date filters (`from`, `to`) are dates, and a report may cover at most 30 days (`MAX_REPORT_RANGE_DAYS`). A filter sent as an empty string means "no filter".

### `GET /overview`

Returns one object (see `packages/shared/src/types/overview.type.ts`): device counts by state, open alert counts, the newest open alerts, cold storages ranked by problem, the worst devices, 24 hourly alert buckets, notification counts, today's diagnostics, WhatsApp status (the QR code is never included) and the current pauses. A paused device is counted as paused before its state is looked at, the same as on the Live page.

## 4. Conventions and adding a feature

### Layout

One folder per module in `apps/backend/src/<module>/`:

```
<name>.controller.ts   routes, validation pipes, nothing else
<name>.service.ts      rules, throws AppException subclasses
<name>.repository.ts   all SQL, extends BaseRepository
<name>.module.ts
*.spec.ts              unit tests next to the file
```

Shared pieces: `common/` (exception filter, interceptor, pipes, guards, throttle), `database/schema/` (Drizzle tables), `config/env.validation.ts` (environment).

### Rules

- Controllers do not contain logic. They take a validated body, call the service, return the result. The interceptor wraps it.
- Every body and query goes through `new ZodValidationPipe(schema)`. IDs through `ParseUUIDPipe`.
- Services throw `AppException` subclasses. Do not throw `HttpException` or return error objects.
- Unique and check constraints are mapped to codes in `db_constraints.ts`. Add a mapping instead of checking "does it exist" before every insert.
- Repositories take an optional `tx` so a service can compose them in one transaction.
- Do not add `@Roles` unless the route should be limited to `super_admin`.
- Error messages for users are Indonesian; code and comments are English.

### Add a feature: example "Supplier"

1. **Table.** Add `database/schema/suppliers.ts`, export it from `schema/index.ts`, add relations if needed. Run `pnpm --filter backend db:generate`, read the generated SQL in `apps/backend/drizzle/`, then `db:migrate`.
2. **Shared type.** `packages/shared/src/types/suppliers.type.ts`, exported from `packages/shared/src/index.ts`.
3. **Schemas.** `packages/validator/src/suppliers.validator.ts` with `createSupplierSchema` and `updateSupplierSchema` (use `requiredText`, `hasAtLeastOneField`, and the `optionalQuery*` helpers from `common.ts`), exported from `index.ts`. See `divisions.validator.ts` for the smallest example.
4. **Module.** Copy `division/` (controller, service, repository, module) and rename. Register the module in `app.module.ts`.
5. **Constraint codes.** If a name must be unique, add the constraint to `db_constraints.ts` and a code to `ErrorCode`.
6. **Tests.** Add a service spec. If the feature is on a critical path, add a case to `test/critical-flow.e2e-spec.ts`.
7. **Frontend.** See [frontend.md](frontend.md#4-adding-a-page).

Build `packages/shared` and `packages/validator` before the backend; Turborepo does this for `pnpm build`, `pnpm lint` and `pnpm test`.

## 5. Operations

### Requirements

Node 24 or newer, pnpm 12, PostgreSQL 16 (CI uses 16).

### Environment

`apps/backend/.env.example` is the reference; values are checked at startup by `src/config/env.validation.ts`, and the API refuses to start if they are wrong.

| Variable                                                                                                  | Default               | Purpose                                                   |
| --------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------- |
| `NODE_ENV`                                                                                                | `development`         |                                                           |
| `PORT`                                                                                                    | `3000`                |                                                           |
| `DATABASE_URL`                                                                                            | none                  | PostgreSQL connection string                              |
| `DB_SSL`                                                                                                  | `false`               |                                                           |
| `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_MAX_LIFETIME_SECONDS` | 10, 30000, 5000, 1800 | Pool                                                      |
| `DB_STATEMENT_TIMEOUT_MS`, `DB_IDLE_IN_TX_TIMEOUT_MS`                                                     | 30000, 15000          | Server-side timeouts                                      |
| `WEB_URL`                                                                                                 | none                  | The only origin allowed by CORS and Better Auth           |
| `BETTER_AUTH_URL`                                                                                         | none                  | Where this API is reachable from the browser              |
| `BETTER_AUTH_SECRET`                                                                                      | none                  | At least 32 characters. `openssl rand -base64 32`         |
| `AUTH_COOKIE_DOMAIN`                                                                                      | empty                 | Only when web and API are on different subdomains         |
| `SEED_ADMIN_PASSWORD`                                                                                     | none                  | Password of the first `super_admin` created by `db:seed`  |
| `DEVICE_API_KEY`                                                                                          | none                  | At least 16 characters. Sent by devices in `x-device-key` |
| `TRUST_PROXY`                                                                                             | `0`                   | Number of reverse proxies in front of the API             |
| `THROTTLE_LIMIT`                                                                                          | `300`                 | Requests per minute per address, whole API                |
| `THROTTLE_LOGIN_LIMIT`                                                                                    | `10`                  | Sign-in attempts per minute per address                   |
| `WHATSAPP_ENABLED`                                                                                        | `false`               |                                                           |
| `WHATSAPP_AUTH_DIR`                                                                                       | `.baileys_auth`       | WhatsApp session files. Keep and back up this directory   |

### Database

```bash
pnpm --filter backend db:migrate   # apply migrations
pnpm --filter backend db:seed      # first super_admin: username febri, superadmin@csms.local
pnpm --filter backend db:generate  # new migration from schema changes
```

`db:push` skips migration files; use it only on a development database.

### Rate limiting

- General: `@nestjs/throttler`, `THROTTLE_LIMIT` per minute per address.
- Login: a separate limiter in `common/throttle/login_rate_limit.ts` on `POST /api/auth/sign-in`. Better Auth handles its routes outside Nest guards, so a guard cannot cover them. It counts every attempt, right or wrong, and answers 429 with `Retry-After`.
- Exempt: device ingest and `/api/health`.
- Behind a proxy set `TRUST_PROXY` to the number of proxies. Too low and all users share the proxy's address. Too high and a client can fake its address.

### Health

`GET /api/health` is for load balancers and uptime monitors. It checks the database (2 second timeout), whether the offline job has ticked in the last 90 seconds, and the WhatsApp state. Status is `ok`, `degraded` or `down`; the HTTP status is 503 only when the database is down.

### Running in production

```bash
pnpm build
pnpm --filter backend db:migrate
pnpm --filter backend start:prod
```

Or with Docker: see [deployment.md](deployment.md). Run one instance. Back up the PostgreSQL database and `WHATSAPP_AUTH_DIR`.

In development `pnpm dev` also starts `script/fake_telemetry.ts`, which sends readings for 11 simulated devices every 30 seconds. Create devices with the codes in that script (such as `1011`), or the readings are rejected.

### Testing

```bash
pnpm --filter backend test        # unit
pnpm --filter backend test:cov
pnpm --filter backend test:e2e    # needs PostgreSQL
```

Unit tests stub `@nestjs/config` and `@nestjs/schedule`, and mock ESM-only modules such as the WhatsApp service.

E2E tests use a real database and **require** `E2E_DATABASE_URL`. The database name must contain `e2e` or `test`, because the suite truncates every table.

```bash
createdb csms_e2e
E2E_DATABASE_URL=postgres://postgres:password@localhost:5432/csms_e2e pnpm --filter backend test:e2e
```

The two suites cover the critical flow (access, device key, master data, reading to alert, overview, acknowledge, pause, offline detection, retention) and the rate limits (with strict limits of 20 general and 5 login requests per minute). Baileys is replaced by a stub in `test/stubs`. E2E needs Node 24 and runs with `--experimental-vm-modules`.

### CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. Job `verify`: build, lint, typecheck, unit tests. Job `e2e`: a PostgreSQL 16 service container, builds the shared packages, runs `pnpm --filter backend test:e2e`. A newer push cancels the older run on the same branch.

### Common problems

| Symptom                                 | Cause                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| A reading returns 404                   | The device code is not created in Settings, Master Data                            |
| `E2E_DATABASE_URL is not set`           | Intended. Create a test database and set the variable                              |
| `Nest could not find <Service> element` | The provider is missing from its module's `providers`                              |
| Every user gets 429 behind nginx        | `TRUST_PROXY` is 0                                                                 |
| Login works but the next request is 401 | `WEB_URL` / `BETTER_AUTH_URL` / `AUTH_COOKIE_DOMAIN` do not match the real origins |
| Offline alerts right after a restart    | They should not; the job waits 2 minutes. Check the server clock                   |
