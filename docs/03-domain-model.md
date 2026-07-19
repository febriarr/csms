# Domain Model

Dokumen ini menjelaskan konsep domain yang digunakan pada CI-CSMS (Cold Storage Monitoring System).

Sebelum membahas implementasi kode maupun database, penting untuk memahami terlebih dahulu objek bisnis (Domain) yang ada di dalam sistem.

Dokumen ini menjadi acuan bagi seluruh pengembangan agar setiap komponen menggunakan istilah yang sama (Ubiquitous Language).

---

# What is Domain?

Domain adalah representasi dari proses bisnis yang ingin diselesaikan oleh sebuah sistem.

Pada CI-CSMS, tujuan utama domain adalah:

> Memonitor kondisi cold storage berdasarkan data sensor suhu dan menghasilkan notifikasi ketika terjadi perubahan kondisi perangkat.

---

# Domain Overview

```
                 Device
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
TemperatureLog   DeviceState    Alert
                                      │
                                      ▼
                             NotificationLog
```

Setiap domain memiliki tanggung jawab yang berbeda.

---

# Device

Device merepresentasikan sebuah freezer atau cold storage yang dipantau.

Contoh:

```
FREEZER-A

FREEZER-B

FREEZER-C
```

Device memiliki konfigurasi suhu normal.

Contoh:

```
Normal Range

-25°C

↓

-18°C
```

Device juga menyimpan kondisi terbaru hasil evaluasi Rule Engine.

Contoh:

```
NORMAL

WARNING

CRITICAL

OFFLINE

DEFROST
```

---

## Responsibilities

Device bertanggung jawab menyimpan:

- Informasi freezer.
- Konfigurasi suhu.
- Status terbaru.
- Waktu perubahan status.
- Waktu terakhir sensor mengirim data.

Device **tidak menyimpan histori suhu**.

---

# Temperature Log

Temperature Log merupakan **raw data** yang dikirim oleh sensor.

Contoh:

```json
{
  "temperature": -19.3,
  "recordedAt": "2026-07-19T09:30:00Z"
}
```

Temperature Log adalah fakta.

Sistem tidak pernah mengubah data tersebut.

---

## Responsibilities

Temperature Log bertanggung jawab:

- Menyimpan histori suhu.
- Menjadi Source of Truth.
- Menjadi input Rule Engine.

Temperature Log **tidak menyimpan status perangkat**.

---

# Device State

Device State merupakan hasil evaluasi Rule Engine.

Sensor **tidak pernah mengirim state**.

Contoh:

```
Temperature

↓

-17.2°C

↓

WARNING
```

State selalu dihitung oleh sistem.

---

## Available States

| State    | Description                                        |
| -------- | -------------------------------------------------- |
| NORMAL   | Suhu berada dalam rentang normal.                  |
| WARNING  | Suhu mulai keluar dari rentang normal.             |
| CRITICAL | Suhu berada pada kondisi berbahaya.                |
| DEFROST  | Perangkat sedang berada dalam proses defrost.      |
| OFFLINE  | Sensor tidak mengirim data dalam periode tertentu. |

---

# Rule Engine

Rule Engine merupakan komponen yang bertugas mengevaluasi kondisi perangkat.

Input:

```
Temperature
Device Configuration
Current State
```

Output:

```
Device State
```

Rule Engine tidak mengetahui:

- REST API
- Database
- Dashboard
- Notification

Rule Engine hanya bertanggung jawab melakukan evaluasi.

---

# State Transition

State Transition terjadi ketika status perangkat berubah.

Contoh:

```
NORMAL

↓

WARNING
```

atau

```
WARNING

↓

CRITICAL
```

State Transition merupakan dasar dari seluruh sistem alert.

Apabila state tidak berubah.

Contoh:

```
WARNING

↓

WARNING
```

Maka tidak akan dibuat alert baru.

---

# Alert

Alert merupakan Business Event.

Alert dibuat hanya ketika terjadi State Transition.

Contoh:

```
NORMAL

↓

WARNING
```

menghasilkan:

```
Alert Created
```

Sedangkan:

```
WARNING

↓

WARNING
```

tidak menghasilkan alert.

---

## Responsibilities

Alert bertanggung jawab menyimpan:

- Status sebelumnya.
- Status terbaru.
- Penyebab perubahan.
- Waktu perubahan terjadi.

Alert tidak menyimpan histori suhu.

---

# Notification Log

Notification Log merupakan histori pengiriman notifikasi.

Contoh:

```
Alert

↓

WhatsApp

↓

SUCCESS
```

atau

```
Alert

↓

Email

↓

FAILED
```

Notification Log memungkinkan sistem melakukan:

- Audit.
- Retry.
- Monitoring pengiriman.

---

# Domain Relationships

```
Device
 │
 ├──────────────┐
 │              │
 ▼              ▼
TemperatureLog  Alert
                    │
                    ▼
            NotificationLog
```

Relationship:

```
Device

1

↓

N

Temperature Logs
```

```
Device

1

↓

N

Alerts
```

```
Alert

1

↓

N

Notification Logs
```

---

# Business Rules

## Rule 1

Sensor hanya mengirim suhu.

Sensor tidak mengirim:

- WARNING
- CRITICAL
- DEFROST
- OFFLINE

---

## Rule 2

Temperature Log bersifat immutable.

Data historis tidak pernah diubah.

---

## Rule 3

Device State selalu merupakan hasil evaluasi Rule Engine.

---

## Rule 4

Alert hanya dibuat ketika terjadi perubahan state.

---

## Rule 5

Notification dikirim berdasarkan Alert.

Bukan berdasarkan Temperature Log.

---

# Ubiquitous Language

| Term             | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| Device           | Freezer atau cold storage yang dipantau.              |
| Temperature Log  | Histori pembacaan suhu dari sensor.                   |
| Device State     | Kondisi terbaru perangkat hasil evaluasi Rule Engine. |
| State Transition | Perubahan status perangkat.                           |
| Alert            | Business Event akibat perubahan state.                |
| Notification     | Pengiriman informasi kepada pengguna.                 |
| Rule Engine      | Komponen yang mengevaluasi kondisi perangkat.         |

---

# Domain Flow

```
Temperature
      │
      ▼
Temperature Log
      │
      ▼
Rule Engine
      │
      ▼
Device State
      │
      ▼
State Transition
      │
      ▼
Alert
      │
      ▼
Notification
```

---

# Why Separate These Domains?

Pemisahan domain memberikan beberapa keuntungan:

- Setiap komponen memiliki satu tanggung jawab.
- Business rule lebih mudah dipahami.
- Mudah dikembangkan tanpa memengaruhi komponen lain.
- Mempermudah pengujian (testing).
- Mengurangi coupling antar komponen.

Sebagai contoh, perubahan algoritma Rule Engine tidak memerlukan perubahan pada Temperature Log maupun Notification.

---

# Architecture Decisions

## Decision

Memisahkan Raw Data, Device State, Business Event, dan Notification History menjadi domain yang berbeda.

## Why?

- Menghindari pencampuran tanggung jawab.
- Menjadikan histori sensor sebagai Source of Truth.
- Mempermudah analisis historis.
- Mendukung pengembangan fitur baru tanpa mengubah model yang sudah ada.

## Trade-offs

- Jumlah entity bertambah.
- Membutuhkan lebih banyak service dan repository.
- Struktur awal lebih kompleks dibanding aplikasi CRUD sederhana.

---

# Conclusion

Domain Model menjadi fondasi seluruh CI-CSMS.

Dengan memahami hubungan antara **Device**, **Temperature Log**, **Device State**, **Alert**, dan **Notification**, implementasi database, service, maupun Rule Engine dapat dikembangkan secara konsisten tanpa mencampurkan tanggung jawab antar komponen.
