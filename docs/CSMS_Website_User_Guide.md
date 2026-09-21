# Cold Storage Monitoring System

## Website User Guide

Panduan penggunaan untuk membantu pengguna melakukan monitoring suhu,

mengelola perangkat, mengatur penerima notifikasi, melihat laporan, dan

melakukan troubleshooting perangkat.

---

## Daftar Isi

1.  [Pendahuluan](#1-pendahuluan)

2.  [Akses Pengguna dan Login](#2-akses-pengguna-dan-login)

3.  [Status --- Temperature Monitoring](#3-status--temperature-monitoring)

4.  [Overview](#4-overview)

5.  [Devices](#5-devices)

6.  [Notification Recipients](#6-notification-recipients)

7.  [Reports](#7-reports)

8.  [Diagnostics](#8-diagnostics)

9.  [Diagnostics Detail](#9-diagnostics-detail)

10. [Troubleshooting](#10-troubleshooting)

11. [Alur Kerja Harian Operator](#11-alur-kerja-harian-operator)

12. [Tanggung Jawab Pengguna](#12-tanggung-jawab-pengguna)

13. [Quick Reference](#13-quick-reference)

---

# 1. Pendahuluan

Cold Storage Monitoring System (CSMS) adalah platform web pemantauan

terpusat untuk memantau suhu ruang cold storage dan kondisi kesehatan

perangkat pemantau secara real-time dan berkelanjutan.

Aplikasi menyediakan informasi temperatur, status perangkat, notifikasi,

laporan historis, serta data diagnostics untuk membantu pengguna

melakukan monitoring dan troubleshooting.

### Fungsi Utama

- Memantau suhu cold storage.

- Melihat status perangkat monitoring.

- Memantau kondisi sensor dan koneksi Wi-Fi.

- Menerima notifikasi ketika terjadi kondisi suhu abnormal.

- Melihat data historis temperatur.

- Mengekspor data monitoring ke Excel atau CSV.

- Melakukan troubleshooting melalui data diagnostics.

---

# 2. Akses Pengguna dan Login

## 2.1 Ketentuan Akun

Pengguna tidak dapat melakukan registrasi akun secara mandiri.

Seluruh akun dibuat oleh Administrator Sistem. Pengguna mendapatkan

kredensial login dari administrator dan menggunakan akun tersebut untuk

mengakses aplikasi.

> **Penting:** Jangan membagikan username atau password kepada pihak

> yang tidak berwenang.

## 2.2 Login

Untuk masuk ke aplikasi:

1.  Buka URL aplikasi CSMS menggunakan browser.

2.  Masukkan **Name / Username** yang telah diberikan administrator.

3.  Masukkan **Password**.

4.  Klik **Login**.

5.  Setelah login berhasil, pengguna akan diarahkan ke halaman

monitoring.

---

# 3-status - temperature-monitoring

Halaman Status merupakan halaman monitoring temperatur yang digunakan

untuk melihat kondisi cold storage secara real-time.

Informasi yang ditampilkan antara lain:

- Monitoring Date

- Jumlah device yang sedang dimonitor

- Nama device

- Lokasi device

- Current Temperature

- State Status

- Threshold temperatur

- Waktu pembaruan terakhir

- Akses ke riwayat temperatur

## 3.1 Monitoring Date

Menampilkan tanggal monitoring yang sedang berlangsung.

## 3.2 Devices Monitored

Menampilkan jumlah perangkat yang sedang dipantau oleh sistem.

## 3.3 Current Temperature

Menampilkan temperatur terbaru yang diterima dari perangkat.

Contoh:

```text

Current Temperature

-22.44 °C

```

## 3.4 State Status

Menampilkan kondisi perangkat saat ini.

Contoh:

- Active Stable

- Kondisi lain sesuai status yang diterapkan sistem

## 3.5 Threshold Temperatur

Threshold digunakan sebagai acuan untuk menentukan kondisi temperatur.

Contoh konfigurasi:

Status

Rentang Temperatur

NORMAL

< -18°C

DEFROST

-18°C sampai -5°C

WARNING

-5°C sampai -3°C

CRITICAL

> = -3°C

> Rentang di atas merupakan contoh konfigurasi device yang ditampilkan

> pada sistem dan dapat berbeda untuk device lain.

## 3.6 Last Update

Menampilkan waktu terakhir sistem menerima atau memperbarui data dari

perangkat.

## 3.7 Log History

Klik **Log History** pada device untuk melihat riwayat temperatur

perangkat.

---

# 4. Overview

Halaman Overview memberikan ringkasan kondisi sistem dan diagnostics

perangkat.

Halaman ini dapat digunakan sebagai pemeriksaan awal ketika pengguna

mulai melakukan monitoring.

## 4.1 Today Diagnostics

Panel **Today Diagnostics** menampilkan jumlah kegagalan yang tercatat

pada hari tersebut.

Informasi yang ditampilkan:

Kolom

Keterangan

Device

Nama dan kode perangkat

Sensor Fail

Jumlah kegagalan sensor

WiFi Fail

Jumlah kegagalan koneksi Wi-Fi

HTTP Fail

Jumlah kegagalan komunikasi HTTP

Total

Total seluruh kegagalan

Klik **View Details** untuk melihat informasi diagnostics yang lebih

lengkap.

---

# 5. Devices

Halaman Devices digunakan untuk melakukan management perangkat

monitoring.

Pengguna dapat:

- Melihat daftar perangkat.

- Mencari perangkat berdasarkan kode atau nama.

- Membuat perangkat baru.

- Mengubah informasi perangkat.

- Menghapus perangkat.

- Melihat lokasi perangkat.

- Melihat threshold temperatur.

- Melihat status perangkat.

## 5.1 Informasi Device

Setiap perangkat memiliki beberapa informasi utama:

- **Name** --- nama perangkat.

- **Alias** --- kode unik perangkat.

- **Location** --- lokasi cold storage.

- **Threshold Normal**

- **Threshold Defrost**

- **Threshold Warning**

- **Threshold Critical**

- **Status**

## 5.2 Membuat Device Baru

Untuk membuat perangkat baru:

1.  Buka menu **Devices**.

2.  Klik **Create Device**.

3.  Isi **Nama**.

4.  Isi **Alias** dengan kode unik perangkat.

5.  Isi **Lokasi**.

6.  Isi **Batas Suhu Defrost**.

7.  Isi **Batas Suhu Warning**.

8.  Isi **Batas Suhu Critical**.

9.  Klik **Create**.

### Contoh

```text

Nama                  : Testing CS 5

Alias                 : 5005

Lokasi                : cold storage 5

Batas Suhu Defrost    : -18

Batas Suhu Warning    : -5

Batas Suhu Critical   : -3

```

## 5.3 Mengubah Device

Untuk mengubah informasi device:

1.  Buka menu **Devices**.

2.  Cari device yang ingin diubah.

3.  Klik ikon **Edit**.

4.  Ubah informasi yang diperlukan.

5.  Klik **Update**.

> Alias device digunakan sebagai kode unik perangkat dan pada form

> update ditampilkan sebagai field yang tidak dapat diubah.

## 5.4 Menghapus Device

Untuk menghapus perangkat:

1.  Buka menu **Devices**.

2.  Temukan perangkat yang akan dihapus.

3.  Klik ikon **Delete**.

4.  Konfirmasi penghapusan apabila sistem meminta konfirmasi.

Penghapusan sebaiknya dilakukan hanya untuk perangkat yang sudah tidak

digunakan.

---

# 6. Notification Recipients

Halaman **Notification Recipients** digunakan untuk mengatur penerima

notifikasi ketika terjadi kondisi suhu abnormal.

Penerima dapat menggunakan channel yang tersedia, seperti WhatsApp.

## 6.1 Informasi Recipient

Data recipient terdiri dari:

- **Name** --- nama atau identitas penerima.

- **Channel** --- channel yang digunakan untuk notifikasi.

- **Target** --- tujuan pengiriman notifikasi.

- **Status** --- menentukan apakah recipient aktif atau tidak.

## 6.2 Status Recipient

Recipient memiliki status:

- **Active** --- recipient dapat menerima notifikasi.

- **Inactive** --- recipient tidak menerima notifikasi.

Recipient yang tidak aktif tetap dapat tersimpan di dalam sistem tetapi

tidak digunakan untuk pengiriman notifikasi.

## 6.3 Membuat Recipient

Untuk membuat recipient:

1.  Buka menu **Notification Recipients**.

2.  Klik **Create Recipient**.

3.  Isi **Name**.

4.  Pilih **Channel**.

5.  Isi **Target** sesuai channel.

6.  Aktifkan checkbox **Active** apabila recipient harus menerima

notifikasi.

7.  Klik **Save Recipient**.

### Contoh WhatsApp

```text

Name       : Warehouse Supervisor

Channel    : WhatsApp

Target     : 628xxxxxxxxxx

Status     : Active

```

Nomor WhatsApp menggunakan format nomor yang sesuai dengan konfigurasi

sistem, misalnya diawali dengan `62`.

## 6.4 Mengubah Recipient

Untuk mengubah recipient:

1.  Buka menu **Notification Recipients**.

2.  Cari recipient.

3.  Klik ikon **Edit**.

4.  Ubah data yang diperlukan.

5.  Atur status Active atau Inactive.

6.  Klik **Save Recipient**.

## 6.5 Menghapus Recipient

Untuk menghapus recipient:

1.  Temukan recipient pada daftar.

2.  Klik ikon **Delete**.

3.  Konfirmasi penghapusan.

---

# 7. Reports

Halaman Reports digunakan untuk melihat data mentah temperatur yang

direkam oleh sistem.

Data dapat difilter berdasarkan:

- Device

- From Date

- To Date

Hasil laporan dapat diekspor ke:

- Excel (`.xlsx`)

- CSV (`.csv`)

## 7.1 Menampilkan Report

1.  Buka menu **Reports**.

2.  Pilih **Device**.

3.  Pilih **From Date**.

4.  Pilih **To Date**.

5.  Klik **Show Report**.

6.  Sistem menampilkan data temperatur sesuai filter.

## 7.2 Data Report

Data temperatur menampilkan informasi seperti:

Kolom

Keterangan

No

Nomor urut data

Recorded At

Waktu data temperatur direkam

Temperature

Nilai temperatur

## 7.3 Export Excel

Untuk mengunduh laporan dalam format Excel:

1.  Atur Device dan rentang tanggal.

2.  Klik **Show Report**.

3.  Klik **Export Excel**.

4.  File Excel akan diunduh oleh browser.

## 7.4 Export CSV

Untuk mengunduh laporan dalam format CSV:

1.  Atur Device dan rentang tanggal.

2.  Klik **Show Report**.

3.  Klik **Export CSV**.

4.  File CSV akan diunduh oleh browser.

---

# 8. Diagnostics

Halaman Diagnostics digunakan untuk melakukan troubleshooting dan

analisis kondisi perangkat.

Halaman ini membantu pengguna melihat:

- Sensor Fail

- WiFi Fail

- HTTP Fail

- Average RSSI

- Last Reason

- Total failure

- Trend diagnostics

## 8.1 Filter Tanggal

Gunakan:

- **From Date**

- **To Date**

Kemudian klik **Apply** untuk menampilkan diagnostics pada periode yang

dipilih.

## 8.2 Ranking Device

Bagian **Ranking Device** menampilkan ringkasan diagnostics

masing-masing perangkat.

Parameter

Keterangan

Sensor Fail

Jumlah kegagalan pembacaan sensor

WiFi Fail

Jumlah kegagalan koneksi Wi-Fi

HTTP Fail

Jumlah kegagalan komunikasi HTTP

AVG RSSI

Rata-rata kekuatan sinyal Wi-Fi

Last Reason

Alasan terakhir yang dilaporkan device

Total

Total kegagalan

## 8.3 Trend Diagnostics

Grafik trend digunakan untuk melihat jumlah kejadian diagnostics

berdasarkan waktu.

Jenis kejadian yang dapat ditampilkan:

- WiFi

- HTTP

- Sensor

Grafik dapat membantu melihat apakah masalah terjadi secara sporadis

atau berulang pada periode tertentu.

---

# 9. Diagnostics Detail

Halaman Diagnostics Detail digunakan untuk melihat data diagnostics

secara lebih rinci pada device tertentu.

Data yang ditampilkan dapat mencakup:

- Timestamp

- Sensor Fail

- WiFi Fail

- HTTP Fail

- RSSI

- Reason Code

- Reason

## 9.1 Timestamp

Menampilkan waktu ketika data diagnostics dicatat.

## 9.2 Sensor Fail

Menampilkan jumlah kegagalan sensor yang dilaporkan device.

## 9.3 WiFi Fail

Menampilkan jumlah kegagalan koneksi Wi-Fi.

## 9.4 HTTP Fail

Menampilkan jumlah kegagalan komunikasi HTTP dengan server.

## 9.5 RSSI

RSSI menunjukkan kekuatan sinyal Wi-Fi yang diterima perangkat.

Nilai RSSI umumnya berupa angka negatif dalam satuan dBm.

Contoh:

```text

-67 dBm

-70 dBm

-72 dBm

```

## 9.6 Reason Code

Reason Code menunjukkan penyebab perangkat melakukan restart atau

kondisi error tertentu.

Reason code yang digunakan:

Reason

Keterangan

BROWNOUT

Perangkat melakukan restart akibat kondisi brownout atau penurunan tegangan.

PANIC

Perangkat mengalami panic atau error sistem.

WATCHDOG

Perangkat melakukan restart akibat watchdog ketika sistem tidak merespons.

UNKNOWN

Reason code tidak dikenali atau tidak tersedia.

---

# 10. Troubleshooting

Gunakan Diagnostics sebagai langkah awal ketika device mengalami

masalah.

## 10.1 Device Offline

### Kemungkinan Penyebab

- Perangkat kehilangan daya.

- Adaptor bermasalah.

- Perangkat kehilangan koneksi Wi-Fi.

- Access Point bermasalah.

- Perangkat mengalami restart.

### Tindakan Operator

1.  Periksa indikator daya perangkat.

2.  Periksa adaptor dan kabel power.

3.  Pastikan perangkat berada pada lokasi yang sesuai.

4.  Periksa status device pada halaman Status.

### Eskalasi

Jika perangkat tetap offline, lakukan pemeriksaan teknis terhadap power

supply dan koneksi jaringan.

---

## 10.2 Sensor Fail

### Kemungkinan Penyebab

- Sensor terlepas.

- Kabel sensor bermasalah.

- Sensor mengalami kerusakan.

- Pembacaan sensor gagal.

### Tindakan

1.  Buka halaman **Diagnostics**.

2.  Periksa nilai Sensor Fail.

3.  Lakukan pemeriksaan fisik terhadap sensor dan kabel.

4.  Pastikan konektor sensor terpasang dengan benar.

---

## 10.3 WiFi Fail Tinggi

### Kemungkinan Penyebab

- Sinyal Wi-Fi lemah.

- Interferensi.

- Jarak device dengan Access Point terlalu jauh.

- Gangguan jaringan.

- Device melakukan reconnect berulang.

### Tindakan

1.  Periksa nilai AVG RSSI.

2.  Periksa jumlah WiFi Fail.

3.  Periksa lokasi fisik perangkat.

4.  Pastikan tidak terdapat penghalang yang dapat mengganggu sinyal.

---

## 10.4 HTTP Fail

### Kemungkinan Penyebab

- Koneksi internet tidak stabil.

- Server API tidak dapat diakses.

- Request timeout.

- Device gagal mengirim telemetry.

### Tindakan

1.  Periksa nilai HTTP Fail.

2.  Periksa WiFi Fail.

3.  Bandingkan timestamp diagnostics dengan laporan telemetry.

4.  Jika masalah berulang, lakukan eskalasi ke tim teknis.

---

## 10.5 Suhu WARNING atau CRITICAL

### Kemungkinan Penyebab

- Pintu cold storage terbuka.

- Beban pendinginan meningkat.

- Sistem pendingin mengalami masalah.

- Temperatur cold storage meningkat.

### Tindakan

1.  Verifikasi temperatur pada halaman Status.

2.  Periksa kondisi fisik cold storage.

3.  Periksa pintu dan kondisi pendingin.

4.  Ikuti SOP penanganan kondisi temperatur abnormal.

5.  Pastikan penerima notifikasi menerima alert.

---

# 11. Alur Kerja Harian Operator

## 11.1 Awal Shift

1.  Login ke CSMS.

2.  Buka halaman Status.

3.  Periksa tanggal monitoring.

4.  Periksa seluruh device.

5.  Pastikan device yang seharusnya aktif dapat dipantau.

6.  Buka Overview untuk melihat diagnostics hari berjalan.

## 11.2 Selama Shift

1.  Pantau temperatur secara berkala.

2.  Perhatikan perubahan status temperatur.

3.  Perhatikan notifikasi WhatsApp.

4.  Jika terjadi WARNING atau CRITICAL, lakukan verifikasi fisik.

5.  Jika device bermasalah, gunakan Diagnostics untuk melakukan

troubleshooting.

## 11.3 Akhir Shift

1.  Pastikan tidak terdapat device yang tidak terpantau tanpa alasan.

2.  Periksa diagnostics apabila terdapat kegagalan komunikasi.

3.  Pastikan kondisi alert telah ditindaklanjuti sesuai SOP.

---

# 12. Tanggung Jawab Pengguna

Pengguna bertanggung jawab untuk:

- Menjaga kerahasiaan akun dan password.

- Tidak membagikan kredensial kepada pihak yang tidak berwenang.

- Melakukan monitoring temperatur sesuai kebutuhan operasional.

- Melakukan verifikasi ketika terjadi temperature alert.

- Memastikan daftar Notification Recipients tetap sesuai dengan

personel yang berwenang.

- Melaporkan masalah perangkat yang tidak dapat ditangani melalui

pemeriksaan dasar.

- Menggunakan Reports untuk kebutuhan pencatatan dan dokumentasi

apabila diperlukan.

---

# 13. Quick Reference

Kebutuhan

Menu

Fitur

Melihat kondisi temperatur

Status

Current Temperature / Threshold

Melihat ringkasan diagnostics

Overview

Today Diagnostics

Mengelola perangkat

Devices

Create / Update / Delete

Mengatur penerima notifikasi

Notification Recipients

Create / Update / Delete

Melihat data temperatur

Reports

Filter Device & Date

Mengunduh laporan

Reports

Export Excel / CSV

Troubleshooting device

Diagnostics

Ranking / Trend

Melihat detail error

Diagnostics

Diagnostics Detail

Melihat alasan restart

Diagnostics

BROWNOUT / PANIC / WATCHDOG / UNKNOWN

---

## Referensi Status Temperatur

Status

Contoh Rentang

Interpretasi

NORMAL

< -18°C

Temperatur berada pada kondisi normal.

DEFROST

-18°C s/d -5°C

Perangkat berada pada rentang defrost.

WARNING

-5°C s/d -3°C

Temperatur berada pada kondisi warning.

CRITICAL

> = -3°C

Temperatur berada pada kondisi critical.

OFFLINE

Tidak ada telemetry

Perangkat tidak mengirim data monitoring.

> Threshold merupakan konfigurasi pada masing-masing device. Selalu

> gunakan nilai threshold yang tampil pada halaman Devices sebagai acuan

> aktual.

---

## Penutup

CSMS digunakan sebagai sarana monitoring temperatur dan kondisi

perangkat secara terpusat. Pengguna dapat menggunakan Status untuk

monitoring temperatur, Overview untuk ringkasan kondisi teknis, Devices

untuk pengelolaan perangkat, Notification Recipients untuk pengaturan

penerima alert, Reports untuk data historis, dan Diagnostics untuk

troubleshooting.
