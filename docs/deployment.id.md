<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Deployment dengan Docker

> English: [deployment.md](deployment.md) · [Backend](backend.id.md) · [Frontend](frontend.id.md)

`docker-compose.yml` di root repository menjalankan seluruh sistem: PostgreSQL, API, dan dashboard. Dipakai untuk deploy. Untuk development tetap gunakan `pnpm dev`.

```
browser / device ──HTTPS──> reverse proxy (Caddy, nginx, cloudflared; milikmu)
                               └──> web (nginx, 127.0.0.1:WEB_PORT)
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

Hanya `web` yang dipublish, dan secara default hanya di `127.0.0.1` milik host. Reverse proxy yang memegang domain dan sertifikatmu adalah satu-satunya pintu masuk. Browser dan device memakai alamat yang sama.

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

Arahkan reverse proxy ke `127.0.0.1:8080` (lihat [Reverse proxy dan HTTPS](#reverse-proxy-dan-https)), lalu buka `PUBLIC_URL`. Login dengan username `febri` dan password dari `SEED_ADMIN_PASSWORD`, lalu ganti. Buat lokasi, cold room, dan device di Settings, Master Data. Pembacaan dari kode device yang belum ada ditolak dengan 404.

Device mengirim ke `<PUBLIC_URL>/api/temperature` dengan header `x-device-key: <DEVICE_API_KEY>`. `PUBLIC_URL` adalah alamat HTTPS, jadi firmware device harus bisa melakukan request TLS. Kalau tidak bisa, beri proxy satu route HTTP biasa untuk `/api/temperature` di dalam jaringanmu.

## Variabel (`.env`)

| Variabel                                 | Default           | Fungsi                                                                                                                                             |
| ---------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`                             | tidak ada (wajib) | Persis seperti yang diketik di address bar browser, dengan `https://` dan tanpa garis miring di akhir. Menjadi `WEB_URL` dan `BETTER_AUTH_URL` API |
| `WEB_BIND`                               | `127.0.0.1`       | Alamat host tempat container web mendengarkan. `0.0.0.0` membukanya ke jaringan                                                                    |
| `WEB_PORT`                               | `8080`            | Port host untuk container web                                                                                                                      |
| `POSTGRES_USER`, `POSTGRES_DB`           | `csms`, `csms`    |                                                                                                                                                    |
| `POSTGRES_PASSWORD`                      | tidak ada (wajib) | Masuk ke dalam URL: pakai huruf dan angka saja, misalnya `openssl rand -hex 24`                                                                    |
| `BETTER_AUTH_SECRET`                     | tidak ada (wajib) | Minimal 32 karakter                                                                                                                                |
| `DEVICE_API_KEY`                         | tidak ada (wajib) | Minimal 16 karakter                                                                                                                                |
| `SEED_ADMIN_PASSWORD`                    | `ChangeMe123!`    | Hanya dipakai `seed`                                                                                                                               |
| `TRUST_PROXY`                            | `2`               | Jumlah proxy antara browser dan API. Lihat di bawah                                                                                                |
| `THROTTLE_LIMIT`, `THROTTLE_LOGIN_LIMIT` | `300`, `10`       | Lihat [Rate limiting](backend.id.md#rate-limiting)                                                                                                 |
| `WHATSAPP_ENABLED`                       | `false`           |                                                                                                                                                    |

Sisanya (ukuran pool, timeout) memakai default `apps/backend/src/config/env.validation.ts`. Untuk mengubahnya, tambahkan ke service `backend` di `docker-compose.yml`.

## Reverse proxy dan HTTPS

API berjalan dengan `NODE_ENV=production`, yang membuat cookie sesi bersifat `Secure`. Browser hanya menyimpan cookie `Secure` di HTTPS (dan di `http://localhost`), jadi dashboard harus dibuka lewat alamat HTTPS. Reverse proxy-mu yang menyediakannya. Proxy itu harus meneruskan ke `127.0.0.1:<WEB_PORT>`, membawa alamat klien di `X-Forwarded-For`, dan tidak mem-buffer stream live di `/api/events/`.

Caddy (sertifikat otomatis):

```
csms.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

nginx di host:

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
        proxy_buffering off;       # halaman live memakai server-sent events
        proxy_read_timeout 1h;
    }
}
```

Cloudflare Tunnel: arahkan public hostname ke `http://localhost:8080`.

### `TRUST_PROXY`

Isi dengan jumlah proxy antara browser dan API, **termasuk nginx di dalam container web**:

| Susunan                                                          | `TRUST_PROXY` |
| ---------------------------------------------------------------- | ------------- |
| Caddy, nginx, atau cloudflared di host, lalu container web       | `2` (default) |
| Sama seperti di atas, di belakang proxy Cloudflare (awan oranye) | `3`           |
| Tidak ada proxy di depan, `WEB_BIND=0.0.0.0`                     | `1`           |

Terlalu kecil: semua user terlihat sebagai proxy dan berbagi satu batas (semua orang kena 429 bersamaan). Terlalu besar: klien bisa memalsukan alamatnya lewat `X-Forwarded-For` miliknya sendiri. Default loopback pada `WEB_BIND` yang membuat nilai `2` aman: tidak ada yang bisa menjangkau container web tanpa melewati proxy-mu.

Untuk mengecek, login dengan password salah lebih dari `THROTTLE_LOGIN_LIMIT` kali dari satu browser, lalu coba dari jaringan lain. Jaringan kedua tidak boleh ikut terblokir.

### Tanpa HTTPS

`http://localhost:8080` di server itu sendiri berfungsi tanpa sertifikat. Lewat HTTP biasa di alamat lain, browser membuang cookie: login dijawab 200 dan request berikutnya 401. Untuk uji coba di LAN kamu tetap butuh HTTPS di depan; tidak ada pengaturan untuk mematikan cookie secure.

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

| Gejala                                                              | Penyebab                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `set POSTGRES_PASSWORD in .env` (atau variabel lain)                | Variabel wajib belum ada di `.env`                                                                        |
| `backend` restart terus, log berisi `Invalid environment variables` | Ada nilai yang terlalu pendek atau salah format, misalnya `BETTER_AUTH_SECRET` kurang dari 32 karakter    |
| `migrate` berhenti dengan error, `backend` tidak pernah start       | Baca `docker compose logs migrate`. Password berisi `@` atau `/` merusak URL koneksi                      |
| Login 200, lalu semuanya 401                                        | `PUBLIC_URL` tidak sama dengan alamat di browser, atau situs dibuka lewat HTTP biasa selain localhost     |
| 502 atau halaman kosong dari proxy                                  | Proxy tidak mengarah ke `127.0.0.1:<WEB_PORT>`, atau `docker compose ps` menunjukkan `web` tidak berjalan |
| Semua orang kena 429                                                | `TRUST_PROXY` lebih kecil dari jumlah proxy di depan                                                      |
| `VITE_API_URL` atau kode web diubah, tidak berpengaruh              | Image web harus dibangun ulang: `docker compose up -d --build web`                                        |
| Dashboard jalan, pembacaan ditolak                                  | `DEVICE_API_KEY` di device salah (401), atau kode device belum ada (404)                                  |
