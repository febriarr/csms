# Cold Storage Monitoring System (CI-CSMS)

> A scalable IoT-based cold storage monitoring system built with Express.js, TypeScript, PostgreSQL, Drizzle ORM, EJS, and Server-Sent Events (SSE).

---

# Overview

CI-CSMS (Cold Storage Monitoring System) adalah sistem monitoring suhu cold storage yang dirancang untuk menerima data sensor secara real-time, menyimpan seluruh histori pembacaan suhu, mendeteksi kondisi abnormal menggunakan Rule Engine, serta mengirimkan notifikasi ketika terjadi perubahan kondisi perangkat.

Berbeda dengan sistem monitoring sederhana yang mengirim notifikasi setiap kali sensor mengirim data, CI-CSMS menggunakan pendekatan **State Transition Event** sehingga notifikasi hanya dikirim ketika status perangkat berubah.

Contoh:

```
NORMAL
   │
   ▼
WARNING   ✅ Kirim Notifikasi

WARNING
   │
   ▼
WARNING   ❌ Tidak ada Notifikasi

WARNING
   │
   ▼
CRITICAL  ✅ Kirim Notifikasi

CRITICAL
   │
   ▼
NORMAL    ✅ Recovery Notification
```

Pendekatan ini mengurangi spam notifikasi dan membuat histori alert lebih mudah dianalisis.

---

# Objectives

Sistem ini dikembangkan dengan beberapa tujuan utama:

- Monitoring suhu cold storage secara real-time.
- Menyimpan histori pembacaan sensor secara lengkap.
- Mendeteksi kondisi abnormal menggunakan Rule Engine.
- Menghindari pengiriman notifikasi berulang (spam).
- Menyediakan histori perubahan kondisi perangkat.
- Mudah diperluas untuk berbagai media notifikasi.
- Menjadi fondasi sistem monitoring yang scalable.

---

# Core Principles

## 1. Raw Data is Immutable

Semua data yang dikirim sensor dianggap sebagai fakta (raw data).

Data yang sudah tersimpan **tidak pernah diubah**.

Contoh:

| Recorded At | Temperature |
| ----------- | ----------: |
| 08:00:00    |     -18.0°C |

Record tersebut akan tetap sama selamanya.

Apabila algoritma Rule Engine berubah di masa depan, yang berubah hanyalah hasil evaluasinya, bukan data historinya.

---

## 2. State is Derived

Sensor **tidak pernah mengirim status** seperti:

- NORMAL
- WARNING
- CRITICAL

Sensor hanya mengirim data suhu.

Contoh:

```json
{
  "temperature": -17.5
}
```

Kemudian Rule Engine mengevaluasi data tersebut menjadi:

```
WARNING
```

Artinya status perangkat merupakan hasil analisis sistem, bukan berasal dari sensor.

---

## 3. Alerts are Business Events

Alert bukan merupakan pembacaan sensor.

Alert adalah **event** ketika status perangkat berubah.

Misalnya:

```
NORMAL
↓

WARNING
```

akan menghasilkan satu Alert.

Sedangkan:

```
WARNING
↓

WARNING
```

tidak menghasilkan Alert baru.

---

## 4. Notifications are Independent

Pengiriman notifikasi dipisahkan dari proses monitoring.

Monitoring tetap berjalan walaupun provider WhatsApp atau Email sedang mengalami gangguan.

Hal ini mempermudah implementasi Queue maupun Background Worker di masa depan.

---

# High-Level Architecture

```text
Temperature Sensor
        │
        ▼
 REST API (Express)
        │
        ▼
Temperature Repository
        │
        ▼
Rule Engine
        │
        ▼
State Manager
        │
        ▼
Alert Repository
        │
        ▼
Notification Dispatcher
        │
   ┌────┴─────┐
   ▼          ▼
WhatsApp     Email
```

---

# Data Flow

```
Sensor
    │
    ▼
temperature_logs
    │
    ▼
Rule Engine
    │
    ▼
Device State
    │
    ▼
State Transition?
    │
 ┌──┴───┐
 │      │
No     Yes
 │      │
 │      ▼
 │   alerts
 │      │
 │      ▼
 │ notification_logs
 │      │
 └──────▼
   Notification Service
```

---

# Main Components

| Component               | Responsibility                     |
| ----------------------- | ---------------------------------- |
| REST API                | Menerima data dari sensor          |
| Temperature Repository  | Menyimpan histori suhu             |
| Rule Engine             | Menentukan status perangkat        |
| State Manager           | Membandingkan status lama dan baru |
| Alert Repository        | Menyimpan histori perubahan status |
| Notification Dispatcher | Mengirim notifikasi                |
| Dashboard               | Monitoring kondisi perangkat       |

---

# Domain Model

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

---

# Database Overview

| Table             | Purpose                                      |
| ----------------- | -------------------------------------------- |
| devices           | Menyimpan informasi perangkat yang dimonitor |
| temperature_logs  | Menyimpan histori pembacaan sensor           |
| alerts            | Menyimpan histori perubahan status perangkat |
| notification_logs | Menyimpan histori pengiriman notifikasi      |

---

# Design Decisions

## Event-Based Alert

Alert dibuat berdasarkan perubahan status, bukan setiap pembacaan sensor.

Tujuannya:

- Mengurangi spam notifikasi.
- Mempermudah audit.
- Mempermudah analisis histori.

---

## Immutable Temperature History

Semua histori sensor disimpan apa adanya.

Data historis menjadi **Source of Truth** yang dapat digunakan kembali apabila algoritma Rule Engine berubah di masa depan.

---

## Separation of Concerns

Setiap komponen hanya memiliki satu tanggung jawab.

| Component     | Responsibility             |
| ------------- | -------------------------- |
| Repository    | Database Access            |
| Rule Engine   | Evaluasi kondisi perangkat |
| State Manager | Deteksi perubahan status   |
| Dispatcher    | Distribusi notifikasi      |

---

# Technology Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Runtime     | Node.js                  |
| Language    | TypeScript               |
| Framework   | Express.js               |
| Database    | PostgreSQL               |
| ORM         | Drizzle ORM              |
| View Engine | EJS                      |
| Frontend    | Vanilla JavaScript       |
| Charts      | Chart.js                 |
| Realtime    | Server-Sent Events (SSE) |

---

# Future Improvements

Beberapa fitur yang telah dipertimbangkan pada desain sistem:

- Defrost Detection
- Offline Detection
- Queue Worker (BullMQ)
- WhatsApp Notification
- Email Notification
- Telegram Notification
- Webhook Notification
- Dashboard Analytics
- Historical Reports
- Multi-Tenant Support
- Device Grouping
- Predictive Maintenance

---

# Development Philosophy

Seluruh sistem dikembangkan berdasarkan beberapa prinsip berikut:

- Clean Architecture
- Repository Pattern
- Service Layer Pattern
- Domain-Oriented Design
- Event-Based Architecture
- SOLID Principles
- YAGNI (You Aren't Gonna Need It)
- Keep It Simple
- Scalable by Design

---

# Conclusion

CI-CSMS tidak hanya dirancang sebagai aplikasi monitoring suhu, tetapi juga sebagai contoh implementasi arsitektur backend modern yang mengutamakan keterpisahan tanggung jawab (Separation of Concerns), skalabilitas, dan kemudahan pengembangan di masa depan.

Dengan memisahkan **Raw Data**, **Device State**, **Business Events**, dan **Notification History**, sistem tetap sederhana untuk MVP namun telah memiliki fondasi yang kuat untuk berkembang menjadi sistem monitoring skala produksi.
