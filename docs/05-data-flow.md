# Data Flow

Dokumen ini menjelaskan bagaimana data mengalir di dalam CI-CSMS (Cold Storage Monitoring System), mulai dari sensor mengirimkan data hingga notifikasi diterima oleh pengguna.

Berbeda dengan dokumen sebelumnya yang membahas struktur sistem, dokumen ini berfokus pada **alur proses (behavior)** yang terjadi ketika sistem berjalan.

---

# Overview

Secara umum, alur sistem terdiri dari lima tahapan utama.

```
Sensor
   │
   ▼
Receive Temperature
   │
   ▼
Evaluate Rules
   │
   ▼
Update Device State
   │
   ▼
Create Alert
   │
   ▼
Send Notification
```

---

# Complete Data Flow

```
+----------------------+
| Temperature Sensor   |
+----------+-----------+
           │
           │ HTTP POST
           ▼
+----------------------+
| Temperature API      |
+----------+-----------+
           │
           ▼
+----------------------+
| Temperature Service  |
+----------+-----------+
           │
           ▼
+----------------------+
| Save Temperature Log |
+----------+-----------+
           │
           ▼
+----------------------+
| Rule Engine          |
+----------+-----------+
           │
           ▼
+----------------------+
| Compare State        |
+----------+-----------+
      │
      ├───────────────┐
      │               │
 State Same      State Changed
      │               │
      │               ▼
      │        Update Device State
      │               │
      │               ▼
      │          Create Alert
      │               │
      │               ▼
      │     Create Notification Log
      │               │
      │               ▼
      │   Notification Dispatcher
      │               │
      │      ┌────────┴────────┐
      │      ▼                 ▼
      │ WhatsApp            Email
      │
      ▼
    Finish
```

---

# Request Flow

Sensor mengirim data menggunakan HTTP Request.

Contoh payload:

```json
{
  "deviceCode": "FREEZER-A",
  "temperature": -18.7,
  "recordedAt": "2026-07-19T09:30:00Z"
}
```

Endpoint:

```
POST /api/v1/temperature
```

---

# Step 1 — Receive Request

Controller menerima request.

```
Sensor
    │
    ▼
TemperatureController
```

Controller hanya bertugas:

- Validasi payload
- Memanggil service
- Mengembalikan response

Controller tidak boleh menjalankan business logic.

---

# Step 2 — Save Temperature Log

Service menyimpan data sensor.

```
TemperatureService
        │
        ▼
TemperatureRepository
        │
        ▼
temperature_logs
```

Data yang disimpan merupakan **raw data**.

Data ini tidak akan diubah di kemudian hari.

---

# Step 3 — Evaluate Rules

Setelah histori berhasil disimpan, Rule Engine melakukan evaluasi.

Input:

```
Device Configuration

+

Current State

+

Latest Temperature
```

Output:

```
NORMAL

atau

WARNING

atau

CRITICAL

atau

DEFROST

atau

OFFLINE
```

Rule Engine hanya menghasilkan keputusan.

Rule Engine tidak menyimpan data.

---

# Step 4 — Compare State

Service membandingkan state lama dengan state baru.

Misalnya:

```
Previous State

NORMAL

Current State

WARNING
```

Karena berbeda:

```
NORMAL

↓

WARNING
```

Maka terjadi State Transition.

---

# State Transition

Jika state berubah:

```
NORMAL

↓

WARNING
```

Sistem akan:

- Update devices.state
- Update state_changed_at
- Insert Alert
- Insert Notification Log
- Dispatch Notification

---

Jika state tidak berubah.

Contoh:

```
WARNING

↓

WARNING
```

Maka proses berhenti.

Tidak ada Alert.

Tidak ada Notification.

---

# Step 5 — Create Alert

Alert merepresentasikan perubahan kondisi perangkat.

Contoh:

| From   | To      |
| ------ | ------- |
| NORMAL | WARNING |

Alert disimpan ke tabel:

```
alerts
```

Alert bukan histori suhu.

Alert merupakan Business Event.

---

# Step 6 — Create Notification Log

Sebelum mengirim notifikasi.

Sistem membuat histori terlebih dahulu.

```
notification_logs

↓

PENDING
```

Contoh:

```
Alert

↓

Notification Log

↓

PENDING
```

---

# Step 7 — Dispatch Notification

Dispatcher mengambil Notification Log.

```
Notification Dispatcher
        │
        ├────────────┐
        ▼            ▼
 WhatsApp         Email
```

Apabila berhasil.

```
SUCCESS
```

Apabila gagal.

```
FAILED
```

Status diperbarui tanpa memengaruhi Alert.

---

# Response Flow

Setelah seluruh proses selesai.

API mengembalikan response.

Contoh:

```json
{
  "success": true
}
```

Sensor tidak perlu mengetahui:

- Alert
- Notification
- Dashboard

Sensor hanya bertugas mengirim suhu.

---

# Sequence Diagram

```
Sensor
   │
   │ POST Temperature
   ▼
Controller
   │
   ▼
Service
   │
   ▼
Temperature Repository
   │
   ▼
Database
   │
   ▼
Rule Engine
   │
   ▼
Compare State
   │
   ├───────────────┐
   │               │
Same State   Different State
   │               │
   │               ▼
   │        Update Device
   │               │
   │               ▼
   │         Create Alert
   │               │
   │               ▼
   │    Create Notification
   │               │
   │               ▼
   │         Dispatcher
   │               │
   │         WhatsApp / Email
   │
   ▼
HTTP Response
```

---

# Error Flow

## Invalid Device

```
Request

↓

Device Not Found

↓

400 Bad Request
```

---

## Invalid Payload

```
Request

↓

Validation Failed

↓

422 Unprocessable Entity
```

---

## Database Error

```
Repository

↓

Database Error

↓

500 Internal Server Error
```

---

# Why Save Temperature Before Rule Evaluation?

Urutan proses sengaja dibuat seperti berikut:

```
Save Temperature

↓

Evaluate Rule
```

Dengan cara ini, histori sensor selalu tersimpan meskipun Rule Engine mengalami error.

Hal ini memastikan bahwa tidak ada data sensor yang hilang.

---

# Why Compare State?

Misalkan sensor mengirim:

```
-17°C
```

Sebanyak 300 kali.

Tanpa State Comparison:

```
300 Alert
```

Dengan State Comparison:

```
1 Alert
```

Pendekatan ini mengurangi spam notifikasi dan menghasilkan histori yang lebih bersih.

---

# Why Notification Log First?

Notification Log dibuat sebelum menghubungi provider.

```
Alert

↓

Notification Log (PENDING)

↓

WhatsApp API

↓

SUCCESS / FAILED
```

Dengan pendekatan ini sistem dapat:

- Retry notifikasi gagal
- Audit histori pengiriman
- Mengganti provider tanpa mengubah Alert

---

# Architecture Decisions

## Decision

Menggunakan alur berbasis **State Transition** daripada langsung mengirim notifikasi setiap pembacaan sensor.

## Why?

- Mengurangi spam notifikasi.
- Mempermudah analisis histori.
- Memisahkan fakta (temperature) dengan kejadian bisnis (alert).
- Siap mendukung queue dan asynchronous processing.

## Trade-offs

- Membutuhkan proses evaluasi tambahan.
- Flow aplikasi menjadi sedikit lebih kompleks.
- Memerlukan komponen State Manager.

---

# Conclusion

Seluruh alur CI-CSMS dirancang berdasarkan prinsip bahwa **Temperature Log adalah fakta**, **Device State adalah kondisi saat ini**, **Alert adalah perubahan kondisi**, dan **Notification adalah proses distribusi informasi**.

Pemisahan tersebut membuat sistem lebih mudah dipelihara, diuji, dan dikembangkan seiring bertambahnya fitur maupun jumlah perangkat yang dimonitor.
