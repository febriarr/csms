<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Deployment dengan Docker

> English: [deployment.md](deployment.md) · [Backend](backend.id.md) · [Frontend](frontend.id.md)

`docker-compose.yml` di root repository menjalankan seluruh sistem: PostgreSQL, API, dan dashboard. Dipakai untuk deploy. Untuk development tetap gunakan `pnpm dev`.

```
browser / device ──> web (nginx, port WEB_PORT)
                        ├── /          file statis dashboard
                        └── /api/*  ─> backend (NestJS, port 3000, tidak dipublish)
                                          └──> db (PostgreSQL 16, tidak dipublish)
```

| Service   | Image                | Catatan                                                                                                                 |
| --------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `db`      | `postgres:16-alpine` | Data di volume `db-data`                                                                                                |
| `migrate` | `csms-backend`       | Menjalankan `node dist/database/migrate.js` sekali, lalu selesai. Backend baru start setelah ini sukses                 |
| `backend` | `csms-backend`       | Dibangun dari `apps/backend/Dockerfile`. Berjalan sebagai user non-root `node`. Sesi WhatsApp di volume `whatsapp-auth` |
| `web`     | `csms-web`           | Dibangun dari `apps/web/Dockerfile`. nginx menyajikan dashboard dan meneruskan `/api` ke backend                        |
| `seed`    | `csms-backend`       | Hanya jalan jika diminta (profile `tools`)                                                                              |

Hanya `web` yang dipublish. Browser dan device memakai alamat yang sama.

## Kenapa satu origin

nginx meneruskan `/api` ke backend, jadi dashboard dan API satu origin. Cookie sesi menjadi first-party: tidak ada CORS, tidak perlu `AUTH_COOKIE_DOMAIN`, dan tidak ada cookie lintas situs yang bisa dibuang browser. Image web dibangun dengan `VITE_API_URL=/api`.

## Start pertama

Kebutuhan: Docker dengan plugin Compose.

```bash
cp .env.example .env
# edit .env: PUBLIC_URL, POSTGRES_PASSWORD, BETTER_AUTH_SECRET, DEVICE_API_KEY, SEED_ADMIN_PASSWORD

docker compose up -d --build
docker compose run --rm seed        # super admin pertama, sekali saja
```

Buka `PUBLIC_URL`. Login dengan username `febri` dan password dari `SEED_ADMIN_PASSWORD`, lalu ganti. Buat lokasi, cold room, dan device di Settings, Master Data. Pembacaan dari kode device yang belum ada ditolak dengan 404.

Device mengirim ke `<PUBLIC_URL>/api/temperature` dengan header `x-device-key: <DEVICE_API_KEY>`.

## Variabel (`.env`)

| Variabel                                 | Default           | Fungsi                                                                                                                       |
| ---------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`                             | tidak ada (wajib) | Persis seperti yang diketik di address bar browser, tanpa garis miring di akhir. Menjadi `WEB_URL` dan `BETTER_AUTH_URL` API |
| `WEB_PORT`                               | `8080`            | Port host untuk container web                                                                                                |
| `POSTGRES_USER`, `POSTGRES_DB`           | `csms`, `csms`    |                                                                                                                              |
| `POSTGRES_PASSWORD`                      | tidak ada (wajib) | Masuk ke dalam URL: pakai huruf dan angka saja, misalnya `openssl rand -hex 24`                                              |
| `BETTER_AUTH_SECRET`                     | tidak ada (wajib) | Minimal 32 karakter                                                                                                          |
| `DEVICE_API_KEY`                         | tidak ada (wajib) | Minimal 16 karakter                                                                                                          |
| `SEED_ADMIN_PASSWORD`                    | `ChangeMe123!`    | Hanya dipakai `seed`                                                                                                         |
| `TRUST_PROXY`                            | `1`               | Jumlah proxy di depan API. Lihat di bawah                                                                                    |
| `THROTTLE_LIMIT`, `THROTTLE_LOGIN_LIMIT` | `300`, `10`       | Lihat [Rate limiting](backend.id.md#rate-limiting)                                                                           |
| `WHATSAPP_ENABLED`                       | `false`           |                                                                                                                              |

Sisanya (ukuran pool, timeout) memakai default `apps/backend/src/config/env.validation.ts`. Untuk mengubahnya, tambahkan ke service `backend` di `docker-compose.yml`.

## HTTPS

API berjalan dengan `NODE_ENV=production`, yang membuat cookie sesi bersifat `Secure`. Browser hanya menyimpan cookie `Secure` di HTTPS, dan di `http://localhost`. Jadi:

- `http://localhost:8080` di mesin itu sendiri berfungsi.
- `http://192.168.1.20:8080` atau `http://server.local:8080` **tidak**: login dijawab 200 dan request berikutnya 401, karena browser membuang cookie-nya.

Untuk selain localhost, pasang TLS di depan container web (Caddy, Traefik, nginx di host, Cloudflare Tunnel) dan isi `PUBLIC_URL=https://...`.

Jika ada proxy lain di depan container web:

- Isi `TRUST_PROXY=2`: proxy luar dan nginx di dalam container. Dengan default `1`, semua user terlihat sebagai proxy luar dan berbagi satu batas rate limit.
- Proxy luar harus menjadi satu-satunya pintu masuk. Publish port web hanya di loopback, misalnya `ports: ["127.0.0.1:8080:80"]`, kalau tidak klien bisa menjangkau nginx langsung dan mengirim `X-Forwarded-For` palsu.

Device tidak butuh proxy yang paham HTTPS, tetapi firmware harus bisa HTTPS jika `PUBLIC_URL` HTTPS dan device lewat alamat itu.

## Operasi sehari-hari

```bash
docker compose ps                          # status dan health
docker compose logs -f backend             # log API
docker compose up -d --build               # update setelah `git pull`
docker compose down                        # berhenti, data tetap di volume
```

Migrasi berjalan setiap `up`: service `migrate` menjalankan yang belum ada dan melewati sisanya.

Update me-restart backend beberapa detik. Device yang gagal mengirim pada saat itu sebaiknya mencoba ulang; pembacaan yang sama diterima sebagai duplikat.

### Backup dan restore

```bash
# database
docker compose exec -T db pg_dump -U csms csms | gzip > csms-$(date +%F).sql.gz

# restore ke database kosong
gunzip -c csms-2026-10-31.sql.gz | docker compose exec -T db psql -U csms csms
```

Pakai nilai `POSTGRES_USER` dan `POSTGRES_DB` jika kamu mengubahnya. Simpan dump di mesin lain.

Sesi WhatsApp ada di volume `csms_whatsapp-auth`. Kalau hilang, QR code harus discan ulang:

```bash
docker run --rm -v csms_whatsapp-auth:/data -v "$PWD":/backup alpine tar czf /backup/whatsapp-auth.tgz -C /data .
```

### WhatsApp

Isi `WHATSAPP_ENABLED=true` di `.env`, jalankan `docker compose up -d`, lalu buka dialog WhatsApp di dashboard (super admin) dan scan QR code.

### Ganti kunci device

Ubah `DEVICE_API_KEY` di `.env`, jalankan `docker compose up -d backend`, lalu perbarui device. Sebelum device memakai kunci baru, pembacaannya ditolak, dan setelah beberapa saat ia tampil offline.

## Batasan

- Satu instance backend. Jangan scale `backend` lebih dari satu container: dispatcher notifikasi dan stream event live ada di dalam proses (lihat [Keputusan desain](backend.id.md#2-keputusan-desain)).
- Hitungan rate limit ada di memori dan hilang saat restart.
- PostgreSQL adalah satu container dengan satu volume. Untuk data penting, buat dump rutin atau pakai database terkelola: arahkan `DATABASE_URL` untuk `migrate` dan `backend` ke sana, lalu hapus service `db`.

## Pemecahan masalah

| Gejala                                                              | Penyebab                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `set POSTGRES_PASSWORD in .env` (atau variabel lain)                | Variabel wajib belum ada di `.env`                                                                     |
| `backend` restart terus, log berisi `Invalid environment variables` | Ada nilai yang terlalu pendek atau salah format, misalnya `BETTER_AUTH_SECRET` kurang dari 32 karakter |
| `migrate` berhenti dengan error, `backend` tidak pernah start       | Baca `docker compose logs migrate`. Password berisi `@` atau `/` merusak URL koneksi                   |
| Login 200, lalu semuanya 401                                        | `PUBLIC_URL` tidak sama dengan alamat di browser, atau situs dibuka lewat HTTP biasa selain localhost  |
| Semua orang kena 429                                                | Ada proxy di depan dan `TRUST_PROXY` terlalu kecil                                                     |
| `VITE_API_URL` atau kode web diubah, tidak berpengaruh              | Image web harus dibangun ulang: `docker compose up -d --build web`                                     |
| Dashboard jalan, pembacaan ditolak                                  | `DEVICE_API_KEY` di device salah (401), atau kode device belum ada (404)                               |
