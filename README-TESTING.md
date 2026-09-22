# Testing Guide — ci-csms

## Test tiers

| Tier | Location | Needs real DB/Redis? | Run with |
|---|---|---|---|
| Unit | `tests/unit/` | No | `npm run test:unit` |
| E2E (HTTP-layer) | `tests/e2e/http-layer.test.ts` | No | included in `npm test` |
| Integration | `tests/integration/` | **Yes** (Postgres) | `npm run test:integration` |
| E2E (full flow) | `tests/e2e/full-flow.test.ts` | **Yes** (Postgres) | `npm run test:e2e` |

`npm test` runs only the tiers that need no external services (unit + the
DB-free e2e file), so it's safe to run anywhere, including CI without a
database, and always finishes green.

## Running the DB-dependent tiers

The integration and full-flow e2e suites talk to a real Postgres (schema
created via the project's own Drizzle migrations — no mocking of the DB
layer). They self-skip (not fail) if no database is reachable at
`DATABASE_URL`, so you'll see `X skipped` instead of failures when you run
them without a DB.

To actually run them:

```bash
docker compose -f docker-compose.test.yml up -d
# wait for the healthchecks, then:
DATABASE_URL=postgres://test:test@localhost:5432/ci_csms_test npx drizzle-kit migrate
npm run test:integration
npm run test:e2e
```

`tests/setup/env.setup.ts` already defaults `DATABASE_URL` /
`REDIS_URL` to match `docker-compose.test.yml`'s credentials, so if you're
running the compose file as-is you don't need to export anything.

## Coverage

```bash
npm run test:coverage
```

Coverage is scoped to the unit tier (services, validators, pure functions,
middleware — everything that doesn't need a live DB). Controllers and
repositories show 0% here by design; they're exercised by the integration
and E2E tiers instead, which aren't included in this coverage run since
they require external services.

## Why `app.ts` needs a client build before tests

`src/app.ts` calls `getViteAssets()` whenever `NODE_ENV !== 'development'`,
which reads `dist/client/.vite/manifest.json` and **throws if it's
missing**. Since tests run with `NODE_ENV=test`, importing `app.ts` (for
the E2E suites) requires that file to exist first:

```bash
npx vite build
```

This repo's CI should run this (or the full `npm run build`) before any
E2E test job. See "Remaining Gaps" in the final test report for a
production-code option to avoid this coupling.
