# System Architecture

Dokumen ini menjelaskan arsitektur CI-CSMS (Cold Storage Monitoring System), pembagian tanggung jawab setiap layer, serta alur komunikasi antar komponen.

---

# Architecture Goals

Arsitektur sistem dirancang dengan beberapa tujuan utama:

- Separation of Concerns
- High Maintainability
- Easy Testing
- Scalability
- Readability
- Extensibility

Sistem dibangun menggunakan pendekatan **Layered Architecture** dengan tambahan **Rule Engine** sebagai domain utama.

---

# High Level Architecture

```text
                +----------------------+
                | Temperature Sensor   |
                +----------+-----------+
                           |
                           |
                    HTTP Request
                           |
                           ▼
                +----------------------+
                |   Express REST API   |
                +----------+-----------+
                           |
                           ▼
                +----------------------+
                |     Controller       |
                +----------+-----------+
                           |
                           ▼
                +----------------------+
                |      Service         |
                +----------+-----------+
                           |
               +-----------+-----------+
               |                       |
               ▼                       ▼
      Rule Engine              Repository Layer
               │                       │
               └-----------+-----------┘
                           │
                           ▼
                     PostgreSQL
                           │
                           ▼
               Notification Dispatcher
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
       WhatsApp API                 Email API
```

---

# Application Layers

```
Presentation
      │
      ▼
Controller
      │
      ▼
Service
      │
      ▼
Rule Engine
      │
      ▼
Repository
      │
      ▼
Database
```

Setiap layer memiliki tanggung jawab yang berbeda dan tidak boleh saling mengambil alih pekerjaan layer lain.

---

# Layer Responsibilities

## Presentation Layer

Berisi:

- EJS
- CSS
- JavaScript
- Chart.js
- Server-Sent Events (SSE)

Tanggung jawab:

- Menampilkan data.
- Menampilkan grafik.
- Menampilkan status perangkat.
- Menampilkan histori alert.
- Tidak mengandung business logic.

---

## Controller Layer

Controller menerima request dari client.

Contoh:

```
POST /api/v1/temperature
```

Controller hanya bertugas:

- Validasi request
- Memanggil service
- Mengembalikan response

Controller **tidak boleh**:

- Query database langsung
- Menentukan status perangkat
- Mengirim notifikasi

---

## Service Layer

Service merupakan pusat business process.

Contoh:

```
TemperatureService
```

Flow:

```
Save Temperature
        │
        ▼
Rule Engine
        │
        ▼
State Manager
        │
        ▼
Alert Service
        │
        ▼
Notification Service
```

Service bertugas mengorkestrasi seluruh proses.

---

## Rule Engine

Rule Engine bertanggung jawab menentukan kondisi perangkat berdasarkan data sensor.

Input:

```
Temperature
Current State
Device Configuration
```

Output:

```
NORMAL
WARNING
CRITICAL
DEFROST
OFFLINE
```

Rule Engine tidak mengetahui database.

Rule Engine juga tidak mengetahui REST API.

Rule Engine hanya fokus pada evaluasi kondisi perangkat.

---

## Repository Layer

Repository bertanggung jawab melakukan komunikasi dengan database.

Repository hanya berisi:

- INSERT
- UPDATE
- DELETE
- SELECT

Repository tidak memiliki business logic.

Contoh:

```
DeviceRepository
```

```
findByCode()

updateState()

findById()
```

---

## Database Layer

Database bertugas menyimpan data.

Database tidak melakukan business process.

Seluruh keputusan bisnis dilakukan oleh Service dan Rule Engine.

---

# Domain Flow

```
Temperature Sensor
        │
        ▼
Temperature Logs
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

Setiap komponen hanya memiliki satu tanggung jawab.

---

# Request Flow

## Sensor → API

```
Sensor
   │
POST /temperature
   │
   ▼
Controller
```

---

## Controller → Service

Controller melakukan validasi payload.

Apabila valid:

```
TemperatureController
          │
          ▼
TemperatureService
```

---

## Service → Repository

Service menyimpan histori suhu.

```
TemperatureService
         │
         ▼
TemperatureRepository
```

---

## Rule Evaluation

Setelah histori berhasil disimpan.

```
TemperatureService
        │
        ▼
Rule Engine
```

Rule Engine menentukan state terbaru.

Misalnya:

```
NORMAL
↓

WARNING
```

---

## State Comparison

State Manager membandingkan:

```
Previous State

VS

Current State
```

Jika tidak berubah.

```
Stop
```

Jika berubah.

```
Insert Alert
```

---

## Notification

```
Alert
   │
   ▼
Notification Dispatcher
   │
   ├── WhatsApp
   ├── Email
   ├── Dashboard
   └── Webhook
```

Setiap channel berjalan secara independen.

---

# Dependency Rule

Dependency hanya boleh mengarah ke bawah.

```
Controller
      │
      ▼
Service
      │
      ▼
Repository
      │
      ▼
Database
```

Yang **tidak boleh** dilakukan:

❌ Repository memanggil Service.

❌ Rule Engine memanggil Controller.

❌ Controller mengakses database langsung.

---

# Why Repository Pattern?

Repository memisahkan business logic dari database.

Keuntungan:

- Mudah di-test.
- Mudah mengganti ORM.
- Query database terpusat.
- Service menjadi lebih bersih.

---

# Why Service Layer?

Service mengorkestrasi seluruh business process.

Contoh:

```
Save Temperature
↓

Evaluate Rules

↓

Compare State

↓

Create Alert

↓

Dispatch Notification
```

Semua proses tersebut merupakan satu business process.

---

# Why Rule Engine?

Business rule merupakan bagian yang paling sering berubah.

Misalnya:

Hari ini:

```
>-18°C

WARNING
```

Besok SOP perusahaan berubah:

```
>-17°C

WARNING
```

Perubahan cukup dilakukan pada Rule Engine.

Layer lain tidak perlu diubah.

---

# Why Event-Based Alert?

Alert dibuat berdasarkan perubahan state.

Bukan berdasarkan setiap pembacaan sensor.

```
Temperature

↓

State

↓

State Transition

↓

Alert
```

Keuntungan:

- Tidak spam notifikasi.
- Histori lebih bersih.
- Mudah dianalisis.

---

# Architecture Decisions

## Decision

Menggunakan Layered Architecture dengan Repository Pattern dan Rule Engine.

## Why?

- Mudah dipahami.
- Mudah di-maintain.
- Business rule terpisah dari database.
- Siap dikembangkan menjadi sistem yang lebih besar.

## Trade-offs

- Jumlah file lebih banyak.
- Sedikit lebih kompleks dibanding CRUD biasa.
- Membutuhkan disiplin dalam membagi tanggung jawab setiap layer.

---

# Conclusion

Arsitektur CI-CSMS dirancang agar setiap komponen memiliki satu tanggung jawab yang jelas.

Dengan memisahkan **Presentation**, **Business Process**, **Rule Evaluation**, **Data Access**, dan **Notification**, sistem menjadi lebih mudah diuji, dipelihara, serta dikembangkan tanpa harus mengubah bagian lain dari aplikasi.
