<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Backend

> English: [backend.md](backend.md) · Frontend: [frontend.id.md](frontend.id.md)

Backend ada di `apps/backend`. Ini API NestJS 11 di atas PostgreSQL (Drizzle ORM), dengan Better Auth untuk login. Semua route berada di bawah prefix `/api`.

Dokumen ini menjelaskan perjalanan satu pembacaan suhu di dalam sistem, alasan desainnya, daftar endpoint, cara menambah fitur, dan cara menjalankannya.

- [1. Alur data](#1-alur-data)
- [2. Keputusan desain](#2-keputusan-desain)
- [3. Referensi API](#3-referensi-api)
- [4. Konvensi dan menambah fitur](#4-konvensi-dan-menambah-fitur)
- [5. Operasional](#5-operasional)

## 1. Alur data

### Ingest

Device mengirim `POST /api/temperature` dengan header `x-device-key`.

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

`reason` (laporan reset: `BROWNOUT`, `PANIC`, `WATCHDOG`, `UNKNOWN` beserta counter) bersifat opsional. Timestamp yang lebih dari 5 menit di depan waktu server, atau lebih tua dari 30 hari, ditolak (`MAX_CLOCK_AHEAD_MS`, `MAX_READING_AGE_MS` di `packages/validator/src/temperature.validator.ts`).

`TemperatureService.ingest` lalu bekerja dalam **satu transaksi**:

1. Kunci baris device (`findByCodeForUpdate`). Dua pembacaan dari satu device diproses bergantian.
2. Simpan pembacaan. Primary key `temperature_logs` adalah `(device_id, recorded_at)`, jadi kirim ulang pembacaan yang sama bentrok dan dijawab sebagai duplikat. Untuk duplikat tidak ada proses lain.
3. Bersama pembacaan, simpan snapshot `state` device, `evaluation`, dan `pause_id`.
4. Jika pembacaan lebih tua dari yang terbaru (`LATE_ARRIVAL`) atau monitoring device dimatikan (`DEVICE_INACTIVE`), berhenti di sini: hanya jadi riwayat.
5. Jika pause menahan alert (`PAUSED`, atau `PULLING_DOWN` setelah pause), berhenti: pembacaan tersimpan, alert tidak dibuat.
6. Selain itu, klasifikasikan suhu. Jika state berbeda dari yang tersimpan: tulis baris `alerts`, perbarui state device, dan (untuk `WARNING`, `CRITICAL`, offline) antrekan satu baris `notification_logs` per penerima yang berlangganan.

Setelah commit, state baru dipublikasikan ke stream SSE. Transaksi yang di-rollback tidak mempublikasikan apa pun. Pembacaan dari kode device yang tidak dikenal dijawab 404.

### Klasifikasi

| State      | Dengan threshold `defrost` | Tanpa                     |
| ---------- | -------------------------- | ------------------------- |
| `NORMAL`   | `t <= defrost`             | `t < warning`             |
| `DEFROST`  | `defrost < t < warning`    | tidak dipakai             |
| `WARNING`  | `warning <= t < critical`  | `warning <= t < critical` |
| `CRITICAL` | `t >= critical`            | `t >= critical`           |

`OFFLINE` bukan klasifikasi satu pembacaan. State ini diset oleh job offline (di bawah).

### Nilai `evaluation`

Disimpan di setiap pembacaan, supaya laporan bisa menjelaskan "di atas threshold tapi tidak ada alert":

| Nilai             | Arti                                                          |
| ----------------- | ------------------------------------------------------------- |
| `EVALUATED`       | Melewati aturan state dan alert yang normal                   |
| `PAUSED`          | Sedang ada pause terencana                                    |
| `PULLING_DOWN`    | Pause sudah selesai, mesin masih diberi waktu untuk mendingin |
| `DEVICE_INACTIVE` | Monitoring device dimatikan                                   |
| `LATE_ARRIVAL`    | Lebih tua dari pembacaan terbaru device                       |

### Pause

Monitoring pause menarget tepat satu device atau satu cold storage. `kind` adalah `MAINTENANCE` atau `MACHINE_OFF`. `endsAt` null berarti "sampai pemberitahuan lebih lanjut". `maxPulldownMinutes` (0 sampai 1440) menahan alert setelah pause selesai, kecuali device sudah membaca di bawah threshold warning sejak itu. Pause tidak pernah menghentikan deteksi offline.

### Deteksi offline

`DeviceOfflineService` berjalan tiap 30 detik. Device dianggap stale jika `now - lastSeenAt > heartbeatIntervalSeconds * 5`. Device yang belum pernah mengirim apa pun tidak dianggap stale. Setelah API start, job menunggu 2 menit supaya restart tidak menghasilkan alert offline palsu. Sebuah flag mencegah dua proses berjalan bersamaan.

### Notifikasi (outbox)

Alert dan pesannya ditulis dalam transaksi yang sama dengan pembacaan, jadi alert tidak mungkin ada tanpa pesannya. Dispatcher membaca baris pending per batch 20 (`DISPATCH_BATCH_SIZE`) dan mengirimnya lewat WhatsApp (Baileys). Pesan gagal dicoba ulang sampai 5 kali, setelah 0, 30, 120, 300, dan 600 detik. Pesan yang masih pending setelah 60 menit (`MAX_MESSAGE_AGE_MINUTES`) ditandai `FAILED`. Channel `EMAIL` ada di skema, tetapi pengirimnya belum ada.

### Retensi

`TemperatureRetentionService` berjalan setiap hari pukul 03:00 Asia/Jakarta dan menghapus `temperature_logs` yang lebih tua dari 5 tahun, per device, per batch 5000. Kegagalan pada satu device dicatat di log lalu lanjut ke device berikutnya. Hanya `temperature_logs` yang punya retensi. `alerts`, `device_diagnostics_logs`, dan `notification_logs` tumbuh tanpa batas.

## 2. Keputusan desain

**Satu transaksi, satu baris terkunci.** Tanpa kunci, dua pembacaan bersamaan bisa sama-sama melihat state lama dan sama-sama membuat alert. Biayanya: pembacaan satu device diproses berurutan. Itu aman untuk interval 30 detik.

**Pembacaan selalu disimpan.** Pembacaan saat pause adalah data audit. Kolom `evaluation` mencatat kenapa alert tidak muncul, jadi laporan tidak ambigu.

**Outbox, bukan kirim di dalam request.** Mengirim WhatsApp di dalam request ingest membuat request device bergantung pada WhatsApp yang hidup. Baris outbox di-commit bersama alert; dispatcher mencoba ulang secara terpisah.

**SSE dipublikasikan setelah commit.** Halaman Live tidak boleh menampilkan state yang tidak ada di database.

**Pause tidak menekan offline.** Kabel yang tercabut saat maintenance adalah gangguan nyata.

**Autentikasi device terpisah dari autentikasi user.** Device tidak punya sesi. `DeviceKeyGuard` membandingkan `x-device-key` dengan `DEVICE_API_KEY` memakai `timingSafeEqual`. Route memakai `@AllowAnonymous()` untuk melewati guard sesi dan `@SkipThrottle()` supaya device di balik satu gateway tidak terblokir.

**Validasi ada di `packages/validator`.** Skema Zod yang sama memvalidasi form di browser dan request di API. Skema untuk device (`telemetrySchema`) tetap di backend karena browser tidak membutuhkannya.

**Satu bentuk error.** Semua kegagalan lewat `AllExceptionsFilter` dan `mapException`, dan keluar sebagai `ErrorResponse`. Web app mengambil keputusan dari `code`, tidak pernah dari teks pesan.

**Satu instance.** Dispatcher dan stream SSE hidup di dalam proses API. Dua instance akan mengirim pesan dua kali dan membagi event live. Multi-instance butuh row locking untuk dispatcher dan bus bersama (Redis) untuk event.

**Zona waktu.** `Asia/Jakarta` (`common/utils/app_timezone.ts`) untuk cron dan batas hari laporan. Timestamp disimpan sebagai `timestamptz`.

## 3. Referensi API

Semua path berada di bawah `/api`. Semua route butuh user yang sudah login kecuali ditandai lain. Hanya route bertanda `super_admin` yang memeriksa role. `admin` adalah role default.

### Envelope respons

Sukses: `{ "success": true, "data": ..., "metadata"?: ... }`. `metadata` ada pada list berhalaman (`PaginationMeta`: `page`, `pageSize`, `totalItems`, `totalPages`). Ukuran halaman default 20, maksimum 100 (`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`).

Gagal:

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

`errors` memetakan nama field ke daftar pesan; `_root` berisi pesan yang tidak punya field. `debug` ditambahkan hanya untuk 5xx di luar production. Pesan untuk user berbahasa Indonesia.

Route yang tidak memakai envelope (`@SkipTransform()`): `GET /events/device-status`, `GET /temperature/report/export`, `GET /health`.

### Kode error

Nilainya bagian dari kontrak: tambah yang baru, jangan ganti nama yang lama (`packages/shared/src/types/api.type.ts`).

Umum: `VALIDATION_FAILED`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `ENTITY_NOT_FOUND`, `CONFLICT`, `DUPLICATE_ENTITY`, `RESOURCE_IN_USE`, `REFERENCE_NOT_FOUND`, `BUSINESS_RULE_VIOLATION`, `CONCURRENT_UPDATE`, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

Yang spesifik berasal dari constraint database (`common/exception/db_constraints.ts`), misalnya `DEVICE_CODE_TAKEN`, `DEVICE_POINT_TAKEN`, `COLD_STORAGE_NAME_TAKEN`, `DIVISION_NAME_TAKEN`, `LOCATION_NAME_TAKEN`, `RECIPIENT_TARGET_TAKEN`, `SUBSCRIPTION_DUPLICATE`, `INVALID_THRESHOLD_ORDER`, `INVALID_PAUSE_TARGET`, `INVALID_PAUSE_RANGE`, `INVALID_SUBSCRIPTION_SCOPE`, `EMAIL_TAKEN`.

Pemetaan status: `EntityNotFoundException` 404, `DuplicateEntityException` dan `ResourceInUseException` 409, `BusinessRuleException` 422, validasi 400, rate limit 429, database tidak terjangkau 503.

### Endpoint

| Method             | Path                                                                 | Catatan                                                                                                    |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| POST               | `/auth/sign-in/username` dan `/auth/*` lain                          | Better Auth. Tidak ada sign-up publik. Prefix cookie `csms`. Percobaan login dibatasi                      |
| POST               | `/temperature`                                                       | Ingest device. Header `x-device-key`. Tanpa sesi. Tidak di-throttle. 201                                   |
| GET                | `/temperature/recent`                                                | Pembacaan terbaru untuk sparkline. `deviceIds` berupa daftar dipisah koma                                  |
| GET                | `/temperature/report`                                                | Pembacaan mentah, berhalaman. `deviceId?`, `from?`, `to?`, `page`, `pageSize` (default 50, maks 100)       |
| GET                | `/temperature/report/events`                                         | Alert dan pause dalam satu periode. `deviceId`, `from`, `to` wajib                                         |
| GET                | `/temperature/report/summary`                                        | Jumlah pembacaan per state dan per `evaluation`. Query sama                                                |
| GET                | `/temperature/report/hourly`                                         | Satu baris per jam (min, rata-rata, maks, state terburuk, cakupan). Query sama. Maksimum 744 baris         |
| GET                | `/temperature/report/export`                                         | Unduh file. `deviceId`, `from`, `to`, `format=xlsx\|csv`, `granularity=raw\|hourly`                        |
| GET                | `/overview`                                                          | Semua yang dibutuhkan halaman Overview dalam satu panggilan                                                |
| GET                | `/alert`                                                             | Berhalaman. `deviceId`, `coldStorageId`, `toState`, `reasonCode`, `acknowledged=true\|false`, `from`, `to` |
| PATCH              | `/alert/:id/acknowledge`                                             | Tanpa body. User diambil dari sesi                                                                         |
| GET, POST          | `/monitoring-pause`                                                  | Daftar (`deviceId?`, `coldStorageId?`) dan buat                                                            |
| PATCH              | `/monitoring-pause/:id/end`                                          | Body `endsAt?`, `note?`. 422 jika sudah berakhir                                                           |
| DELETE             | `/monitoring-pause/:id`                                              |                                                                                                            |
| GET, POST          | `/division`, `/location`, `/cold-storage`, `/device`                 | Master data. 201 saat dibuat                                                                               |
| GET                | `/device/:id`                                                        |                                                                                                            |
| PATCH, DELETE      | `/division/:id`, `/location/:id`, `/cold-storage/:id`, `/device/:id` | DELETE 204; 409 `RESOURCE_IN_USE` jika masih dipakai baris lain                                            |
| GET, POST          | `/notification-recipients`                                           |                                                                                                            |
| GET, PATCH, DELETE | `/notification-recipients/:id`                                       |                                                                                                            |
| PUT                | `/notification-recipients/:id/subscriptions`                         | Mengganti seluruh langganan. Scope: `ALL`, `DIVISION`, `LOCATION`, `COLD_STORAGE`, `DEVICE`                |
| GET                | `/notification-log`                                                  | Berhalaman. `deviceId`, `coldStorageId`, `channel`, `status`, `search`, `from`, `to`                       |
| GET                | `/diagnostic/summary`, `/today`, `/trend`, `/detail`                 | Kesehatan device dari counter diagnostik (`detail` berhalaman dan butuh `deviceId`)                        |
| GET                | `/events/device-status`                                              | Stream SSE perubahan state device                                                                          |
| GET                | `/whatsapp/status`                                                   | `super_admin`. Status tautan untuk dialog WhatsApp                                                         |
| PATCH              | `/user/me`, `/user/me/password`                                      | User yang login, akun sendiri                                                                              |
| GET, POST          | `/user`                                                              | `POST` hanya `super_admin`                                                                                 |
| PATCH              | `/user/:id`, `/user/:id/role`                                        | `super_admin`                                                                                              |
| DELETE             | `/user/:id`                                                          | `super_admin`                                                                                              |
| GET                | `/health`                                                            | Tanpa sesi, tanpa throttle, tanpa envelope. Lihat [Health](#health)                                        |

Filter tanggal (`from`, `to`) berupa tanggal, dan satu laporan maksimal 30 hari (`MAX_REPORT_RANGE_DAYS`). Filter yang dikirim sebagai string kosong berarti "tanpa filter".

### `GET /overview`

Mengembalikan satu objek (lihat `packages/shared/src/types/overview.type.ts`): jumlah device per state, jumlah alert terbuka, alert terbuka terbaru, cold storage yang diurutkan menurut masalah, device terburuk, 24 bucket alert per jam, jumlah notifikasi, diagnostik hari ini, status WhatsApp (kode QR tidak pernah disertakan), dan pause yang sedang berjalan. Device yang sedang di-pause dihitung sebagai paused sebelum state-nya dilihat, sama seperti di halaman Live.

## 4. Konvensi dan menambah fitur

### Susunan

Satu folder per modul di `apps/backend/src/<modul>/`:

```
<nama>.controller.ts   route dan validation pipe, tidak lebih
<nama>.service.ts      aturan bisnis, melempar subclass AppException
<nama>.repository.ts   semua SQL, extends BaseRepository
<nama>.module.ts
*.spec.ts              unit test di samping file-nya
```

Bagian bersama: `common/` (exception filter, interceptor, pipe, guard, throttle), `database/schema/` (tabel Drizzle), `config/env.validation.ts` (environment).

### Aturan

- Controller tidak berisi logika. Ambil body yang sudah tervalidasi, panggil service, kembalikan hasilnya. Interceptor yang membungkusnya.
- Setiap body dan query melewati `new ZodValidationPipe(schema)`. ID melewati `ParseUUIDPipe`.
- Service melempar subclass `AppException`. Jangan melempar `HttpException` atau mengembalikan objek error.
- Constraint unique dan check dipetakan ke kode di `db_constraints.ts`. Tambahkan pemetaan, jangan mengecek "sudah ada atau belum" sebelum tiap insert.
- Repository menerima `tx` opsional supaya service bisa menyusunnya dalam satu transaksi.
- Jangan tambah `@Roles` kecuali route memang hanya untuk `super_admin`.
- Pesan error untuk user berbahasa Indonesia; kode dan komentar berbahasa Inggris.

### Menambah fitur: contoh "Supplier"

1. **Tabel.** Tambah `database/schema/suppliers.ts`, ekspor dari `schema/index.ts`, tambah relasi bila perlu. Jalankan `pnpm --filter backend db:generate`, baca SQL hasilnya di `apps/backend/drizzle/`, lalu `db:migrate`.
2. **Tipe bersama.** `packages/shared/src/types/suppliers.type.ts`, diekspor dari `packages/shared/src/index.ts`.
3. **Skema.** `packages/validator/src/suppliers.validator.ts` berisi `createSupplierSchema` dan `updateSupplierSchema` (pakai `requiredText`, `hasAtLeastOneField`, dan helper `optionalQuery*` dari `common.ts`), diekspor dari `index.ts`. Contoh terkecil: `divisions.validator.ts`.
4. **Modul.** Salin `division/` (controller, service, repository, module) lalu ganti namanya. Daftarkan modul di `app.module.ts`.
5. **Kode constraint.** Jika nama harus unik, tambah constraint di `db_constraints.ts` dan kode di `ErrorCode`.
6. **Test.** Tambah spec service. Jika fitur berada di jalur kritis, tambah kasus di `test/critical-flow.e2e-spec.ts`.
7. **Frontend.** Lihat [frontend.id.md](frontend.id.md#4-menambah-halaman).

Build `packages/shared` dan `packages/validator` sebelum backend; Turborepo melakukannya untuk `pnpm build`, `pnpm lint`, dan `pnpm test`.

## 5. Operasional

### Kebutuhan

Node 24 atau lebih baru, pnpm 12, PostgreSQL 16 (CI memakai 16).

### Environment

`apps/backend/.env.example` adalah acuannya; nilai diperiksa saat start oleh `src/config/env.validation.ts`, dan API menolak start jika salah.

| Variabel                                                                                                  | Default               | Fungsi                                                  |
| --------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| `NODE_ENV`                                                                                                | `development`         |                                                         |
| `PORT`                                                                                                    | `3000`                |                                                         |
| `DATABASE_URL`                                                                                            | tidak ada             | Connection string PostgreSQL                            |
| `DB_SSL`                                                                                                  | `false`               |                                                         |
| `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_MAX_LIFETIME_SECONDS` | 10, 30000, 5000, 1800 | Pool                                                    |
| `DB_STATEMENT_TIMEOUT_MS`, `DB_IDLE_IN_TX_TIMEOUT_MS`                                                     | 30000, 15000          | Timeout di sisi server                                  |
| `WEB_URL`                                                                                                 | tidak ada             | Satu-satunya origin yang diizinkan CORS dan Better Auth |
| `BETTER_AUTH_URL`                                                                                         | tidak ada             | Alamat API ini dari sisi browser                        |
| `BETTER_AUTH_SECRET`                                                                                      | tidak ada             | Minimal 32 karakter. `openssl rand -base64 32`          |
| `AUTH_COOKIE_DOMAIN`                                                                                      | kosong                | Hanya jika web dan API di subdomain berbeda             |
| `SEED_ADMIN_PASSWORD`                                                                                     | tidak ada             | Password `super_admin` pertama yang dibuat `db:seed`    |
| `DEVICE_API_KEY`                                                                                          | tidak ada             | Minimal 16 karakter. Dikirim device di `x-device-key`   |
| `TRUST_PROXY`                                                                                             | `0`                   | Jumlah reverse proxy di depan API                       |
| `THROTTLE_LIMIT`                                                                                          | `300`                 | Request per menit per alamat, seluruh API               |
| `THROTTLE_LOGIN_LIMIT`                                                                                    | `10`                  | Percobaan login per menit per alamat                    |
| `WHATSAPP_ENABLED`                                                                                        | `false`               |                                                         |
| `WHATSAPP_AUTH_DIR`                                                                                       | `.baileys_auth`       | File sesi WhatsApp. Simpan dan backup folder ini        |

### Database

```bash
pnpm --filter backend db:migrate   # jalankan migrasi
pnpm --filter backend db:seed      # super_admin pertama: username febri, superadmin@csms.local
pnpm --filter backend db:generate  # migrasi baru dari perubahan skema
```

`db:push` melewati file migrasi; pakai hanya di database development.

### Rate limiting

- Umum: `@nestjs/throttler`, `THROTTLE_LIMIT` per menit per alamat.
- Login: limiter terpisah di `common/throttle/login_rate_limit.ts` pada `POST /api/auth/sign-in`. Better Auth menangani route-nya di luar guard Nest, jadi guard tidak bisa mencakupnya. Limiter menghitung setiap percobaan, benar atau salah, dan menjawab 429 dengan `Retry-After`.
- Dikecualikan: ingest device dan `/api/health`.
- Di belakang proxy, isi `TRUST_PROXY` dengan jumlah proxy. Terlalu kecil: semua user dianggap satu alamat proxy. Terlalu besar: klien bisa memalsukan alamatnya.

### Health

`GET /api/health` untuk load balancer dan uptime monitor. Memeriksa database (timeout 2 detik), apakah job offline berdetak dalam 90 detik terakhir, dan status WhatsApp. Statusnya `ok`, `degraded`, atau `down`; status HTTP baru 503 jika database mati.

### Menjalankan di production

```bash
pnpm build
pnpm --filter backend db:migrate
pnpm --filter backend start:prod
```

Atau dengan Docker: lihat [deployment.id.md](deployment.id.md). Jalankan satu instance. Backup database PostgreSQL dan `WHATSAPP_AUTH_DIR`.

Saat development, `pnpm dev` juga menjalankan `script/fake_telemetry.ts`, yang mengirim pembacaan 11 device simulasi tiap 30 detik. Buat device dengan kode di script itu (misalnya `1011`), kalau tidak pembacaan ditolak.

### Testing

```bash
pnpm --filter backend test        # unit
pnpm --filter backend test:cov
pnpm --filter backend test:e2e    # butuh PostgreSQL
```

Unit test men-stub `@nestjs/config` dan `@nestjs/schedule`, dan me-mock modul ESM-only seperti service WhatsApp.

E2E memakai database sungguhan dan **mewajibkan** `E2E_DATABASE_URL`. Nama database harus mengandung `e2e` atau `test`, karena suite mengosongkan semua tabel.

```bash
createdb csms_e2e
E2E_DATABASE_URL=postgres://postgres:password@localhost:5432/csms_e2e pnpm --filter backend test:e2e
```

Dua suite mencakup alur kritis (akses, device key, master data, pembacaan sampai alert, overview, acknowledge, pause, deteksi offline, retensi) dan rate limit (dengan batas ketat 20 request umum dan 5 login per menit). Baileys diganti stub di `test/stubs`. E2E butuh Node 24 dan berjalan dengan `--experimental-vm-modules`.

### CI

`.github/workflows/ci.yml` berjalan pada push ke `main` dan pada pull request. Job `verify`: build, lint, typecheck, unit test. Job `e2e`: container PostgreSQL 16, build paket bersama, lalu `pnpm --filter backend test:e2e`. Push yang lebih baru membatalkan run lama di branch yang sama.

### Masalah umum

| Gejala                                     | Penyebab                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Pembacaan dijawab 404                      | Kode device belum dibuat di Settings, Master Data                                        |
| `E2E_DATABASE_URL is not set`              | Memang disengaja. Buat database test dan isi variabelnya                                 |
| `Nest could not find <Service> element`    | Provider belum ada di `providers` modulnya                                               |
| Semua user kena 429 di belakang nginx      | `TRUST_PROXY` masih 0                                                                    |
| Login berhasil tapi request berikutnya 401 | `WEB_URL` / `BETTER_AUTH_URL` / `AUTH_COOKIE_DOMAIN` tidak sama dengan origin sebenarnya |
| Alert offline tepat setelah restart        | Seharusnya tidak terjadi; job menunggu 2 menit. Periksa jam server                       |
