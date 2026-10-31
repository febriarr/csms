<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Frontend

> Bahasa Indonesia: [frontend.id.md](frontend.id.md) · Backend: [backend.md](backend.md)

The dashboard lives in `apps/web`: React 19, Vite, React Router, TanStack Query and Table, Tailwind, Recharts. UI components come from the workspace package `@workspace/ui` (shadcn/ui style, Radix primitives).

- [1. Structure and data flow](#1-structure-and-data-flow)
- [2. Design decisions](#2-design-decisions)
- [3. Page and API map](#3-page-and-api-map)
- [4. Adding a page](#4-adding-a-page)
- [5. Operations](#5-operations)

## 1. Structure and data flow

```
apps/web/src/
  main.tsx            providers: Theme, QueryClient, Tooltip, Auth, Router, Toaster
  routes/router.tsx   route table, every page is lazy-loaded
  layouts/            default (sidebar + header), auth-layout (login)
  components/         shared pieces: nav-links.ts, sidebar, breadcrumb, device-state-badge, date-range-filter, ...
  lib/                http-client, api-error, form-errors, format helpers, query-client
  modules/<area>/     one folder per feature
packages/
  shared/             TypeScript types and constants shared with the API
  validator/          Zod schemas shared with the API
  ui/                 components, hooks, globals.css
```

How a request travels, using Divisions as the example:

1. `division/page.tsx` calls `useDivisions()` from `hooks.ts`.
2. The hook is a TanStack Query call. Its `queryFn` is `getDivisions` from `division.api.ts`.
3. `division.api.ts` calls `apiData(http.get<ApiSuccessResponse<Division[]>>("/division"))`.
4. `http-client.ts` sends it with the session cookie to `VITE_API_URL + "/division"`, and `apiData` unwraps `{ success, data }` to `data`.
5. A failure becomes the backend's `ErrorResponse`, unchanged. A failure the backend cannot describe (no response, timeout, a proxy HTML page) becomes a synthetic `ErrorResponse` (`lib/api-error.ts`), so every `error` in a query or mutation has one type.
6. A mutation (`useCreateDivision` and so on) invalidates `divisionKeys.all`. The returned promise keeps the mutation pending until the list is refetched, so a dialog closes exactly when the table shows the new row.

### Authentication

Better Auth keeps the session in an httpOnly cookie, so the app never sees a token. `AuthProvider` reads the session through `useSession()`. Any response with status 401 calls the unauthorized handler, which clears the session; `RequireAuth` then redirects to `/login` and remembers the page the user wanted. `GuestOnly` sends signed-in users away from `/login`. Requests that answer 401 as a normal result (get-session, login, logout) pass `skipUnauthorizedHandler: true`.

### Two ways to stay current

| Page                     | Mechanism                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live (`monitoring/live`) | SSE from `GET /events/device-status` through `useDeviceStream` (one `EventSource` per page, `withCredentials`). A 30 second list refetch runs next to it for what events do not carry (pause details, new devices). After a reconnect the list is reloaded, because events sent while the stream was down are lost |
| Overview (`overview`)    | Polling only: `useOverview` refetches every 30 seconds and on window focus. There is no SSE here on purpose                                                                                                                                                                                                        |

Every other query uses the defaults in `lib/query-client.tsx`: `staleTime` 5 minutes, one retry, no refetch on window focus.

### Forms

Forms use the same Zod schemas as the API (`createDivisionSchema`, `updateDeviceSchema`, ...) from `@workspace/validator`.

1. On submit, `schema.safeParse(values)`. On failure `toFieldErrors(error)` returns `{ field: message }`, with `_root` for messages without a field.
2. On success the mutation runs. A server failure arrives as `ErrorResponse`.
3. `errors.ts` (or a local `getErrorMessage`) maps `error.code` to an Indonesian message, and `CODE_TO_FIELD` maps codes such as `DEVICE_CODE_TAKEN` to the field to highlight. Unknown codes fall back to `error.message`.

## 2. Design decisions

**Routes come from `navLinks`.** `components/nav-links.ts` is the single source for the sidebar and the breadcrumb. Route paths in `router.tsx` repeat the same absolute paths. A parent item with `children` has no page; `getParentRedirects()` redirects it to its first leaf so a breadcrumb link never leads to a 404.

**Lazy routes.** Each page is `lazy: () => import(".../page")` and exports `Component`. The first load only ships the shell.

**Types and schemas are shared, not copied.** A field added in `packages/shared` or `packages/validator` is checked by `tsc` on both sides. Enum values (`DEVICE_STATES`, `ALERT_REASONS`, `READING_EVALUATIONS`, ...) are duplicated on purpose between the database enums and `packages/validator/src/constants.ts`, because the browser must not import the database package. Keep both in sync when you add a state or a reason.

**Switch on `code`, never on `message`.** Messages are for people and may change; codes are the contract.

**One module folder per feature.** `page.tsx`, `hooks.ts`, `<name>.api.ts`, and when needed `columns.tsx`, `form.tsx`, dialogs. Query keys are exported from `hooks.ts` (`divisionKeys`, `overviewKeys`) so other modules can invalidate them. For example, acknowledging an alert from the Overview invalidates both the overview and the alert keys.

**Components from `@workspace/ui`.** Import them by subpath: `@workspace/ui/components/button`. Do not copy a component into the app; add it to `packages/ui`.

**Interface language.** Labels and messages are Indonesian; code and comments are English.

## 3. Page and API map

| Route                                                                         | Module                                 | Backend endpoints                                                                              |
| ----------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/login`                                                                      | `modules/auth`                         | `/auth/*`                                                                                      |
| `/dashboard`                                                                  | `modules/overview`                     | `GET /overview`, `PATCH /alert/:id/acknowledge`                                                |
| `/dashboard/monitoring/live`                                                  | `modules/monitoring/live`              | `GET /device`, `GET /temperature/recent`, SSE `/events/device-status`                          |
| `/dashboard/monitoring/alerts`                                                | `modules/monitoring/alert`             | `GET /alert`, `PATCH /alert/:id/acknowledge`                                                   |
| `/dashboard/monitoring/monitoring-pauses`                                     | `modules/monitoring/monitoring-pauses` | `/monitoring-pause`                                                                            |
| `/dashboard/reports/temperature-history`                                      | `modules/reports/temperature-history`  | `/temperature/report`, `/report/summary`, `/report/events`, `/report/hourly`, `/report/export` |
| `/dashboard/reports/device-diagnostic`                                        | `modules/reports/device-diagnostic`    | `/diagnostic/*`                                                                                |
| `/dashboard/reports/notification-log`                                         | `modules/reports/notification-log`     | `/notification-log`                                                                            |
| `/dashboard/settings/master-data/division`, `location`, `cold-room`, `device` | `modules/settings/master-data/*`       | `/division`, `/location`, `/cold-storage`, `/device`                                           |
| `/dashboard/settings/notifications`                                           | `modules/settings/notification`        | `/notification-recipients`                                                                     |
| `/dashboard/settings/users`                                                   | `modules/settings/users`               | `/user` (changes need `super_admin`)                                                           |

The WhatsApp dialog (`components/whatsapp-dialog.tsx`) uses `/whatsapp/status` and is for `super_admin`.

## 4. Adding a page

Example: a "Supplier" list under Master Data. Do the backend part first ([backend.md](backend.md#4-conventions-and-adding-a-feature)); the shared type and schemas must exist.

1. **Folder.** `src/modules/settings/master-data/supplier/` with `supplier.api.ts`, `hooks.ts`, `page.tsx`. Copy the `division` folder; it is the smallest complete example.
2. **API functions.** One function per endpoint, returning through `apiData` or `apiPaginated`. Paths are relative to `VITE_API_URL`, which already ends in `/api`, so write `"/supplier"`. Accept an optional `AbortSignal` in reads.
3. **Hooks.** Export a `supplierKeys` object, a `queryOptions` factory, one `useQuery` hook, and one `useMutation` per write that invalidates `supplierKeys.all` and returns the promise.
4. **Page.** Export a function named `Component` (the router's `lazy` expects it). Validate form input with the shared schema and show server errors with a `getErrorMessage(error)` that switches on `ErrorCode`.
5. **Navigation.** Add the item to `navLinks` in `components/nav-links.ts`. Add the matching route in `routes/router.tsx` with the same absolute path.
6. **Check.** `pnpm --filter web typecheck`, `pnpm --filter web lint`, then open the page and try: empty state, a duplicate name (409), deleting something in use (409), a 401 after clearing the cookie.

Paginated lists send `page` and `pageSize`, return `metadata` (`page`, `pageSize`, `totalItems`, `totalPages`), and should use `keepPreviousData` and `use-clamp-page` so the page number is corrected after the last row of a page is deleted. A filter that is cleared is sent as `""`; the API treats that as "no filter". Report pages limit the date range to 30 days (`MAX_REPORT_RANGE_DAYS`).

## 5. Operations

### Environment

One variable, in `apps/web/.env` (see `apps/web/.env.example`):

```env
VITE_API_URL=http://localhost:3000/api
```

It must include the `/api` prefix and have no trailing slash. It is read at **build time**: changing it means rebuilding. The API must list the web origin in its `WEB_URL`, otherwise CORS and cookies fail.

### Commands

```bash
pnpm dev                       # API and web together (web on http://localhost:5173)
pnpm --filter web dev          # web only
pnpm --filter web build        # tsc -b && vite build, output in apps/web/dist
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web preview      # serve the production build locally
```

`apps/web/dist` is static files. Serve it from any static host or web server, with a fallback to `index.html` for unknown paths, because routes such as `/dashboard/monitoring/live` exist only in the browser.

### Same site or not

The session cookie is `httpOnly`. If the web app and the API are on different subdomains, set `AUTH_COOKIE_DOMAIN` on the API (for example `.example.com`) and use HTTPS in production.

### Tests

The web app has no automated tests yet. CI runs build, lint and typecheck for it (job `verify`). The behaviour that matters for the dashboard (alerts, pauses, the Overview numbers) is covered by the backend e2e suite.

### Common problems

| Symptom                                         | Cause                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Every request fails with a network error        | `VITE_API_URL` is wrong, or the API is not running                                                         |
| Login works, then you are sent back to `/login` | The cookie is not sent: `WEB_URL` / `BETTER_AUTH_URL` / `AUTH_COOKIE_DOMAIN` do not match the real origins |
| Refreshing a page returns 404 in production     | The static host has no fallback to `index.html`                                                            |
| Live page shows "reconnecting"                  | The SSE stream dropped. The browser retries by itself; "closed" usually means the session expired          |
| 429 after many clicks                           | General limit of the API (`THROTTLE_LIMIT`), or all users share one address behind a proxy (`TRUST_PROXY`) |
