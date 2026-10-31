<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Deployment with Docker

> Bahasa Indonesia: [deployment.id.md](deployment.id.md) · [Backend](backend.md) · [Frontend](frontend.md)

`docker-compose.yml` in the repository root runs the whole system: PostgreSQL, the API and the dashboard. It is meant for deploying. For development keep using `pnpm dev`.

```
browser / devices ──HTTPS──> reverse proxy (Caddy, nginx, cloudflared; yours)
                                └──> web (nginx, 127.0.0.1:WEB_PORT)
                                       ├── /          static dashboard files
                                       └── /api/*  ─> backend (NestJS, port 3000, not published)
                                                         └──> db (PostgreSQL 16, not published)
```

| Service   | Image                | Notes                                                                                                                  |
| --------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `db`      | `postgres:16-alpine` | Data in the named volume `db-data`                                                                                     |
| `migrate` | `csms-backend`       | Runs `node dist/database/migrate.js` once, then exits. The backend starts only after it succeeded                      |
| `backend` | `csms-backend`       | Built from `apps/backend/Dockerfile`. Runs as the non-root user `node`. WhatsApp session in the volume `whatsapp-auth` |
| `web`     | `csms-web`           | Built from `apps/web/Dockerfile`. nginx serves the dashboard and forwards `/api` to the backend                        |
| `seed`    | `csms-backend`       | Only runs when you ask for it (profile `tools`)                                                                        |

Only `web` is published, and by default only on `127.0.0.1` of the host. The reverse proxy that holds your domain and certificate is the only way in. The browser and the devices use the same address.

## Why one origin

nginx forwards `/api` to the backend, so the dashboard and the API have the same origin. The session cookie is then first-party: there is no CORS, no `AUTH_COOKIE_DOMAIN`, and no cross-site cookie that the browser may drop. The web image is built with `VITE_API_URL=/api`.

## First start

Requirements: Docker with the Compose plugin.

```bash
cp .env.example .env
# edit .env: PUBLIC_URL, POSTGRES_PASSWORD, BETTER_AUTH_SECRET, DEVICE_API_KEY, SEED_ADMIN_PASSWORD

docker compose up -d --build
docker compose run --rm seed        # first super admin, once
```

Point your reverse proxy at `127.0.0.1:8080` (see [Reverse proxy and HTTPS](#reverse-proxy-and-https)), then open `PUBLIC_URL`. Sign in with username `febri` and the password from `SEED_ADMIN_PASSWORD`, then change it. Create locations, cold rooms and devices in Settings, Master Data. A reading from an unknown device code is rejected with 404.

Devices post to `<PUBLIC_URL>/api/temperature` with the header `x-device-key: <DEVICE_API_KEY>`. `PUBLIC_URL` is an HTTPS address, so the device firmware must be able to make TLS requests. If it cannot, give the proxy a second plain-HTTP route for `/api/temperature` inside your network.

## Variables (`.env`)

| Variable                                 | Default         | Purpose                                                                                                                                       |
| ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`                             | none (required) | Exactly what is typed in the browser's address bar, with `https://` and no trailing slash. Becomes `WEB_URL` and `BETTER_AUTH_URL` of the API |
| `WEB_BIND`                               | `127.0.0.1`     | Host address the web container listens on. `0.0.0.0` opens it to the network                                                                  |
| `WEB_PORT`                               | `8080`          | Host port of the web container                                                                                                                |
| `POSTGRES_USER`, `POSTGRES_DB`           | `csms`, `csms`  |                                                                                                                                               |
| `POSTGRES_PASSWORD`                      | none (required) | Goes into a URL: use letters and digits, for example `openssl rand -hex 24`                                                                   |
| `BETTER_AUTH_SECRET`                     | none (required) | At least 32 characters                                                                                                                        |
| `DEVICE_API_KEY`                         | none (required) | At least 16 characters                                                                                                                        |
| `SEED_ADMIN_PASSWORD`                    | `ChangeMe123!`  | Used by `seed` only                                                                                                                           |
| `TRUST_PROXY`                            | `2`             | Proxies between the browser and the API. See below                                                                                            |
| `THROTTLE_LIMIT`, `THROTTLE_LOGIN_LIMIT` | `300`, `10`     | See [Rate limiting](backend.md#rate-limiting)                                                                                                 |
| `WHATSAPP_ENABLED`                       | `false`         |                                                                                                                                               |

Everything else (pool sizes, timeouts) keeps the defaults of `apps/backend/src/config/env.validation.ts`. To change one, add it to the `backend` service in `docker-compose.yml`.

## Reverse proxy and HTTPS

The API runs with `NODE_ENV=production`, which makes the session cookie `Secure`. Browsers keep a `Secure` cookie only on HTTPS (and on `http://localhost`), so the dashboard has to be opened through an HTTPS address. Your reverse proxy provides it. It must forward to `127.0.0.1:<WEB_PORT>`, pass the client address in `X-Forwarded-For`, and not buffer the live stream under `/api/events/`.

Caddy (certificates are automatic):

```
csms.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

nginx on the host:

```nginx
server {
    listen 443 ssl;
    server_name csms.example.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;       # the live page uses server-sent events
        proxy_read_timeout 1h;
    }
}
```

Cloudflare Tunnel: point the public hostname at `http://localhost:8080`.

### `TRUST_PROXY`

Set it to the number of proxies between the browser and the API, **counting the nginx inside the web container**:

| Setup                                                           | `TRUST_PROXY` |
| --------------------------------------------------------------- | ------------- |
| Caddy, nginx or cloudflared on the host, then the web container | `2` (default) |
| The same, behind the Cloudflare proxy (orange cloud)            | `3`           |
| No proxy in front, `WEB_BIND=0.0.0.0`                           | `1`           |

Too low and every user looks like the proxy and shares one rate limit (everybody gets 429 together). Too high and a client can forge its address with its own `X-Forwarded-For`. The loopback default of `WEB_BIND` is what makes `2` safe: nobody can reach the web container without passing your proxy.

To check it, sign in with a wrong password more than `THROTTLE_LOGIN_LIMIT` times from one browser, then try from another network. The second network must not be blocked.

### Without HTTPS

`http://localhost:8080` on the server itself works without a certificate. Over plain HTTP on any other address the browser drops the cookie: login answers 200 and the next request is 401. For a test on a LAN you need HTTPS in front; there is no setting that turns the secure cookie off.

## Everyday operations

```bash
docker compose ps                          # state and health
docker compose logs -f backend             # API log
docker compose up -d --build               # update after `git pull`
docker compose down                        # stop, data stays in the volumes
```

Migrations run on every `up`: the `migrate` service applies the ones that are missing, and skips the rest.

An update restarts the backend for a few seconds. Devices that fail to post in that time should retry; a repeated reading is accepted as a duplicate.

### Backup and restore

```bash
# database
docker compose exec -T db pg_dump -U csms csms | gzip > csms-$(date +%F).sql.gz

# restore into an empty database
gunzip -c csms-2026-10-31.sql.gz | docker compose exec -T db psql -U csms csms
```

Use the values of `POSTGRES_USER` and `POSTGRES_DB` if you changed them. Keep the dump on another machine.

The WhatsApp session is in the volume `csms_whatsapp-auth`. Losing it means scanning the QR code again:

```bash
docker run --rm -v csms_whatsapp-auth:/data -v "$PWD":/backup alpine tar czf /backup/whatsapp-auth.tgz -C /data .
```

### WhatsApp

Set `WHATSAPP_ENABLED=true` in `.env`, run `docker compose up -d`, then open the WhatsApp dialog in the dashboard (super admin) and scan the QR code.

### Rotate the device key

Change `DEVICE_API_KEY` in `.env`, run `docker compose up -d backend`, then update the devices. Until a device has the new key its readings are refused, and after a while it shows as offline.

## Limits

- One backend instance. Do not scale `backend` to more than one container: the notification dispatcher and the live event stream live inside the process (see [Design decisions](backend.md#2-design-decisions)).
- The rate limit counters are in memory and reset on restart.
- PostgreSQL is a single container with one volume. For anything critical, take regular dumps or use a managed database: set `DATABASE_URL` for `migrate` and `backend` to it and remove the `db` service.

## Troubleshooting

| Symptom                                                      | Cause                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `set POSTGRES_PASSWORD in .env` (or another variable)        | A required variable is missing in `.env`                                                                                        |
| `backend` restarts, log says `Invalid environment variables` | A value is too short or malformed, for example `BETTER_AUTH_SECRET` under 32 characters                                         |
| `migrate` exits with an error, `backend` never starts        | Read `docker compose logs migrate`. A password with `@` or `/` breaks the connection URL                                        |
| Login is 200, then everything is 401                         | `PUBLIC_URL` does not match the address in the browser, or the site is opened over plain HTTP on something other than localhost |
| 502 or a blank page from the proxy                           | The proxy does not point at `127.0.0.1:<WEB_PORT>`, or `docker compose ps` shows `web` is not running                           |
| Everyone gets 429                                            | `TRUST_PROXY` is lower than the number of proxies in front                                                                      |
| Changed `VITE_API_URL` or the web code, no effect            | The web image must be rebuilt: `docker compose up -d --build web`                                                               |
| Dashboard works, readings are refused                        | Wrong `DEVICE_API_KEY` on the device (401), or the device code does not exist (404)                                             |
