<p align="center">
  <img src="https://cdn.febriardiansyah.my.id/csms-assets/csms-banner.png" alt="CSMS, Cold Storage Monitoring System" width="420">
</p>

# Frontend

> English: [frontend.md](frontend.md) · Backend: [backend.id.md](backend.id.md)

Dashboard ada di `apps/web`: React 19, Vite, React Router, TanStack Query dan Table, Tailwind, Recharts. Komponen UI berasal dari paket workspace `@workspace/ui` (gaya shadcn/ui, primitif Radix).

- [1. Struktur dan alur data](#1-struktur-dan-alur-data)
- [2. Keputusan desain](#2-keputusan-desain)
- [3. Peta halaman dan API](#3-peta-halaman-dan-api)
- [4. Menambah halaman](#4-menambah-halaman)
- [5. Operasional](#5-operasional)

## 1. Struktur dan alur data

```
apps/web/src/
  main.tsx            provider: Theme, QueryClient, Tooltip, Auth, Router, Toaster
  routes/router.tsx   tabel route, semua halaman di-lazy-load
  layouts/            default (sidebar + header), auth-layout (login)
  components/         bagian bersama: nav-links.ts, sidebar, breadcrumb, device-state-badge, date-range-filter, ...
  lib/                http-client, api-error, form-errors, helper format, query-client
  modules/<area>/     satu folder per fitur
packages/
  shared/             tipe TypeScript dan konstanta yang dipakai bersama API
  validator/          skema Zod yang dipakai bersama API
  ui/                 komponen, hook, globals.css
```

Perjalanan satu request, dengan Division sebagai contoh:

1. `division/page.tsx` memanggil `useDivisions()` dari `hooks.ts`.
2. Hook itu adalah panggilan TanStack Query. `queryFn`-nya adalah `getDivisions` dari `division.api.ts`.
3. `division.api.ts` memanggil `apiData(http.get<ApiSuccessResponse<Division[]>>("/division"))`.
4. `http-client.ts` mengirimnya bersama cookie sesi ke `VITE_API_URL + "/division"`, dan `apiData` membuka `{ success, data }` menjadi `data`.
5. Kegagalan menjadi `ErrorResponse` dari backend, apa adanya. Kegagalan yang tidak bisa dijelaskan backend (tidak ada respons, timeout, halaman HTML dari proxy) menjadi `ErrorResponse` sintetis (`lib/api-error.ts`), sehingga setiap `error` pada query atau mutation bertipe sama.
6. Mutation (`useCreateDivision` dan lainnya) meng-invalidate `divisionKeys.all`. Promise yang dikembalikan menahan mutation tetap pending sampai list selesai di-refetch, jadi dialog menutup tepat saat tabel menampilkan baris baru.

### Autentikasi

Better Auth menyimpan sesi di cookie httpOnly, jadi aplikasi tidak pernah melihat token. `AuthProvider` membaca sesi lewat `useSession()`. Respons berstatus 401 memanggil handler unauthorized yang menghapus sesi; `RequireAuth` lalu mengarahkan ke `/login` dan mengingat halaman yang dituju. `GuestOnly` mengusir user yang sudah login dari `/login`. Request yang memang menjawab 401 sebagai hasil normal (get-session, login, logout) memakai `skipUnauthorizedHandler: true`.

### Dua cara tetap mutakhir

| Halaman                  | Mekanisme                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live (`monitoring/live`) | SSE dari `GET /events/device-status` lewat `useDeviceStream` (satu `EventSource` per halaman, `withCredentials`). Refetch list tiap 30 detik berjalan di sampingnya untuk hal yang tidak dibawa event (detail pause, device baru). Setelah reconnect list dimuat ulang, karena event yang dikirim saat stream putus hilang |
| Overview (`overview`)    | Hanya polling: `useOverview` refetch tiap 30 detik dan saat window kembali fokus. Tidak ada SSE di sini, memang disengaja                                                                                                                                                                                                  |

Query lain memakai default di `lib/query-client.tsx`: `staleTime` 5 menit, satu retry, tanpa refetch saat window fokus.

### Form

Form memakai skema Zod yang sama dengan API (`createDivisionSchema`, `updateDeviceSchema`, ...) dari `@workspace/validator`.

1. Saat submit, `schema.safeParse(values)`. Jika gagal, `toFieldErrors(error)` mengembalikan `{ field: pesan }`, dengan `_root` untuk pesan tanpa field.
2. Jika lolos, mutation dijalankan. Kegagalan dari server datang sebagai `ErrorResponse`.
3. `errors.ts` (atau `getErrorMessage` lokal) memetakan `error.code` ke pesan Indonesia, dan `CODE_TO_FIELD` memetakan kode seperti `DEVICE_CODE_TAKEN` ke field yang disorot. Kode yang tidak dikenal memakai `error.message`.

## 2. Keputusan desain

**Route berasal dari `navLinks`.** `components/nav-links.ts` adalah satu-satunya sumber untuk sidebar dan breadcrumb. Path route di `router.tsx` mengulang path absolut yang sama. Item parent yang punya `children` tidak punya halaman; `getParentRedirects()` mengarahkannya ke daun pertama supaya link breadcrumb tidak berujung 404.

**Route lazy.** Setiap halaman memakai `lazy: () => import(".../page")` dan mengekspor `Component`. Pemuatan pertama hanya membawa kerangka.

**Tipe dan skema dipakai bersama, bukan disalin.** Field yang ditambah di `packages/shared` atau `packages/validator` diperiksa `tsc` di kedua sisi. Nilai enum (`DEVICE_STATES`, `ALERT_REASONS`, `READING_EVALUATIONS`, ...) sengaja diduplikasi antara enum database dan `packages/validator/src/constants.ts`, karena browser tidak boleh mengimpor paket database. Jaga keduanya tetap sama saat menambah state atau alasan.

**Ambil keputusan dari `code`, bukan `message`.** Pesan untuk manusia dan boleh berubah; kode adalah kontraknya.

**Satu folder modul per fitur.** `page.tsx`, `hooks.ts`, `<nama>.api.ts`, dan bila perlu `columns.tsx`, `form.tsx`, dialog. Query key diekspor dari `hooks.ts` (`divisionKeys`, `overviewKeys`) supaya modul lain bisa meng-invalidate-nya. Contohnya, acknowledge alert dari Overview meng-invalidate key overview dan key alert.

**Komponen dari `@workspace/ui`.** Impor lewat subpath: `@workspace/ui/components/button`. Jangan menyalin komponen ke app; tambahkan di `packages/ui`.

**Bahasa antarmuka.** Label dan pesan berbahasa Indonesia; kode dan komentar berbahasa Inggris.

## 3. Peta halaman dan API

| Route                                                                         | Modul                                  | Endpoint backend                                                                               |
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
| `/dashboard/settings/users`                                                   | `modules/settings/users`               | `/user` (perubahan butuh `super_admin`)                                                        |

Dialog WhatsApp (`components/whatsapp-dialog.tsx`) memakai `/whatsapp/status` dan hanya untuk `super_admin`.

## 4. Menambah halaman

Contoh: daftar "Supplier" di bawah Master Data. Kerjakan bagian backend lebih dulu ([backend.id.md](backend.id.md#4-konvensi-dan-menambah-fitur)); tipe bersama dan skema harus sudah ada.

1. **Folder.** `src/modules/settings/master-data/supplier/` berisi `supplier.api.ts`, `hooks.ts`, `page.tsx`. Salin folder `division`; itu contoh lengkap yang paling kecil.
2. **Fungsi API.** Satu fungsi per endpoint, mengembalikan lewat `apiData` atau `apiPaginated`. Path relatif terhadap `VITE_API_URL`, yang sudah berakhir dengan `/api`, jadi tulis `"/supplier"`. Terima `AbortSignal` opsional pada operasi baca.
3. **Hook.** Ekspor objek `supplierKeys`, factory `queryOptions`, satu hook `useQuery`, dan satu `useMutation` per operasi tulis yang meng-invalidate `supplierKeys.all` dan mengembalikan promise-nya.
4. **Halaman.** Ekspor fungsi bernama `Component` (itu yang diharapkan `lazy` di router). Validasi input form dengan skema bersama dan tampilkan error server dengan `getErrorMessage(error)` yang memakai `switch` pada `ErrorCode`.
5. **Navigasi.** Tambahkan item ke `navLinks` di `components/nav-links.ts`. Tambahkan route yang sesuai di `routes/router.tsx` dengan path absolut yang sama.
6. **Cek.** `pnpm --filter web typecheck`, `pnpm --filter web lint`, lalu buka halamannya dan coba: tampilan kosong, nama ganda (409), hapus data yang masih dipakai (409), 401 setelah cookie dihapus.

List berhalaman mengirim `page` dan `pageSize`, menerima `metadata` (`page`, `pageSize`, `totalItems`, `totalPages`), dan sebaiknya memakai `keepPreviousData` serta `use-clamp-page` supaya nomor halaman dikoreksi setelah baris terakhir sebuah halaman dihapus. Filter yang dikosongkan dikirim sebagai `""`; API menganggapnya "tanpa filter". Halaman laporan membatasi rentang tanggal 30 hari (`MAX_REPORT_RANGE_DAYS`).

## 5. Operasional

### Environment

Satu variabel, di `apps/web/.env` (lihat `apps/web/.env.example`):

```env
VITE_API_URL=http://localhost:3000/api
```

Harus memuat prefix `/api` dan tanpa garis miring di akhir. Nilainya dibaca saat **build**: mengubahnya berarti build ulang. API harus mencantumkan origin web di `WEB_URL`, kalau tidak CORS dan cookie gagal.

### Perintah

```bash
pnpm dev                       # API dan web bersamaan (web di http://localhost:5173)
pnpm --filter web dev          # web saja
pnpm --filter web build        # tsc -b && vite build, hasil di apps/web/dist
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web preview      # layani build production secara lokal
```

`apps/web/dist` berisi file statis. Layani dari static host atau web server mana pun, dengan fallback ke `index.html` untuk path yang tidak dikenal, karena route seperti `/dashboard/monitoring/live` hanya ada di browser.

### Satu situs atau tidak

Cookie sesi bersifat `httpOnly`. Jika web dan API di subdomain berbeda, isi `AUTH_COOKIE_DOMAIN` di API (misalnya `.example.com`) dan pakai HTTPS di production.

### Test

Web app belum punya test otomatis. CI menjalankan build, lint, dan typecheck untuknya (job `verify`). Perilaku yang penting bagi dashboard (alert, pause, angka Overview) dicakup oleh suite e2e backend.

### Masalah umum

| Gejala                                         | Penyebab                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Semua request gagal dengan network error       | `VITE_API_URL` salah, atau API tidak berjalan                                                                   |
| Login berhasil, lalu dikembalikan ke `/login`  | Cookie tidak terkirim: `WEB_URL` / `BETTER_AUTH_URL` / `AUTH_COOKIE_DOMAIN` tidak sama dengan origin sebenarnya |
| Refresh halaman di production menghasilkan 404 | Static host tidak punya fallback ke `index.html`                                                                |
| Halaman Live menampilkan "reconnecting"        | Stream SSE terputus. Browser mencoba lagi sendiri; "closed" biasanya berarti sesi habis                         |
| 429 setelah banyak klik                        | Batas umum API (`THROTTLE_LIMIT`), atau semua user dianggap satu alamat di belakang proxy (`TRUST_PROXY`)       |
