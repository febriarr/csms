# Database Design

Dokumen ini menjelaskan desain database yang digunakan pada CI-CSMS (Cold Storage Monitoring System), termasuk struktur tabel, relasi, alasan pemilihan tipe data, indexing, serta keputusan desain yang diambil selama pengembangan.

---

# Database Goals

Database dirancang dengan beberapa tujuan utama:

- Menyimpan histori sensor secara lengkap.
- Mendukung evaluasi Rule Engine.
- Menyimpan histori perubahan status perangkat.
- Menyediakan audit trail untuk notifikasi.
- Mudah dikembangkan tanpa mengubah struktur inti.

---

# Database Overview

```
+----------------+
|    devices     |
+----------------+
        │
        │ 1
        │
        │ N
+----------------------+
| temperature_logs     |
+----------------------+

        │
        │ 1
        │
        │ N
+----------------+
|    alerts      |
+----------------+
        │
        │ 1
        │
        │ N
+------------------------+
| notification_logs      |
+------------------------+
```

---

# Entity Relationship

## Device

Menyimpan informasi freezer yang dimonitor.

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

---

## Alert

Alert berasal dari perubahan status Device.

Relationship:

```
Alert

1

↓

N

Notification Logs
```

---

# Tables

## devices

Menyimpan informasi perangkat beserta kondisi terbaru.

| Column                 | Type         | Description                 |
| ---------------------- | ------------ | --------------------------- |
| id                     | UUID         | Primary key                 |
| code                   | VARCHAR      | Kode unik perangkat         |
| name                   | VARCHAR      | Nama perangkat              |
| location               | VARCHAR      | Lokasi freezer              |
| normal_min_temperature | NUMERIC(5,2) | Batas minimum suhu normal   |
| normal_max_temperature | NUMERIC(5,2) | Batas maksimum suhu normal  |
| state                  | ENUM         | Status terbaru perangkat    |
| state_changed_at       | TIMESTAMP    | Waktu perubahan status      |
| last_seen_at           | TIMESTAMP    | Waktu terakhir sensor aktif |
| is_active              | BOOLEAN      | Status perangkat            |
| created_at             | TIMESTAMP    | Waktu dibuat                |
| updated_at             | TIMESTAMP    | Waktu diperbarui            |

---

### Why UUID?

UUID dipilih karena:

- Aman digunakan pada sistem terdistribusi.
- Tidak bergantung pada sequence database.
- Lebih mudah apabila nantinya menggunakan beberapa service.
- Mengurangi kemungkinan collision saat sinkronisasi data.

---

### Why Current State Stored?

Walaupun status dapat dihitung kembali dari histori, status terbaru disimpan sebagai cache agar dashboard tidak perlu melakukan evaluasi seluruh histori setiap kali melakukan request.

---

## temperature_logs

Menyimpan seluruh histori pembacaan suhu.

| Column      | Type         | Description                |
| ----------- | ------------ | -------------------------- |
| id          | UUID         | Primary key                |
| device_id   | UUID         | Foreign key ke devices     |
| temperature | NUMERIC(5,2) | Suhu yang diterima         |
| recorded_at | TIMESTAMP    | Waktu sensor mencatat suhu |
| received_at | TIMESTAMP    | Waktu server menerima data |
| created_at  | TIMESTAMP    | Waktu data disimpan        |

---

### Why Recorded At and Received At?

Sensor dapat mengalami keterlambatan pengiriman.

Contoh:

```
Sensor

09:00

↓

Internet Putus

↓

Server

09:05
```

Dengan memisahkan kedua timestamp tersebut, sistem tetap mengetahui kapan suhu sebenarnya dicatat.

---

### Why Immutable?

Temperature Log merupakan **Source of Truth**.

Data historis tidak pernah diubah.

Apabila algoritma Rule Engine berubah, yang berubah hanyalah hasil evaluasinya, bukan data sensor.

---

## alerts

Menyimpan histori perubahan status perangkat.

| Column      | Type      | Description             |
| ----------- | --------- | ----------------------- |
| id          | UUID      | Primary key             |
| device_id   | UUID      | Foreign key             |
| from_state  | ENUM      | Status sebelumnya       |
| to_state    | ENUM      | Status terbaru          |
| cause       | ENUM      | Penyebab perubahan      |
| reason      | TEXT      | Penjelasan tambahan     |
| occurred_at | TIMESTAMP | Waktu perubahan terjadi |
| created_at  | TIMESTAMP | Waktu data dibuat       |

---

### Why Transition Instead of Incident?

Alert merepresentasikan perubahan status.

Contoh:

```
NORMAL

↓

WARNING
```

Disimpan sebagai satu Alert.

Sedangkan:

```
WARNING

↓

WARNING
```

Tidak menghasilkan Alert baru.

Hal ini membuat histori alert lebih ringkas dan mudah dianalisis.

---

## notification_logs

Menyimpan histori pengiriman notifikasi.

| Column        | Type      | Description        |
| ------------- | --------- | ------------------ |
| id            | UUID      | Primary key        |
| alert_id      | UUID      | Foreign key        |
| channel       | ENUM      | Media notifikasi   |
| recipient     | VARCHAR   | Tujuan notifikasi  |
| status        | ENUM      | Status pengiriman  |
| message       | TEXT      | Isi pesan          |
| error_message | TEXT      | Error ketika gagal |
| sent_at       | TIMESTAMP | Waktu pengiriman   |
| created_at    | TIMESTAMP | Waktu dibuat       |

---

### Why Separate Notification?

Satu Alert dapat menghasilkan beberapa notifikasi.

Contoh:

```
Alert

↓

WhatsApp

↓

SUCCESS

↓

Email

↓

FAILED
```

Dengan desain ini histori pengiriman dapat diaudit dan mendukung proses retry.

---

# Database Constraints

## Primary Key

Semua tabel menggunakan UUID sebagai Primary Key.

---

## Foreign Key

```
temperature_logs.device_id

↓

devices.id
```

```
alerts.device_id

↓

devices.id
```

```
notification_logs.alert_id

↓

alerts.id
```

---

## Unique Constraint

Device Code harus unik.

```
devices.code
```

Selain itu, kombinasi berikut juga dibuat unik:

```
device_id

+

recorded_at
```

Tujuannya untuk mencegah data sensor yang sama tersimpan dua kali ketika sensor melakukan retry.

---

# Index Strategy

## devices

Index:

```
code
```

Digunakan ketika sensor mengirim:

```
FREEZER-A
```

Server harus menemukan device dengan cepat.

---

## temperature_logs

Index:

```
device_id
```

Untuk histori per perangkat.

---

Index:

```
recorded_at
```

Untuk laporan berdasarkan waktu.

---

Composite Index:

```
device_id

+

recorded_at
```

Digunakan pada query:

```
Histori suhu FREEZER-A
7 hari terakhir
```

---

## alerts

Index:

```
device_id
```

Untuk histori alert perangkat.

---

Index:

```
occurred_at
```

Untuk laporan kronologis.

---

Composite Index:

```
device_id

+

occurred_at
```

Untuk histori alert berdasarkan perangkat.

---

## notification_logs

Index:

```
alert_id
```

Untuk melihat seluruh notifikasi dari sebuah alert.

---

Index:

```
status
```

Untuk proses retry notifikasi gagal.

---

# Enum Design

## Device State

```
NORMAL

WARNING

CRITICAL

OFFLINE

DEFROST
```

---

## Alert Cause

```
HIGH_TEMPERATURE

LOW_TEMPERATURE

DEVICE_OFFLINE

DEFROST_DETECTED
```

---

## Notification Channel

```
WHATSAPP

EMAIL

TELEGRAM

DASHBOARD

WEBHOOK
```

---

## Notification Status

```
PENDING

SUCCESS

FAILED
```

---

# Data Growth Estimation

Misalkan:

- 1 Device
- Kirim data setiap 30 detik

Maka:

```
120 data / jam

↓

2.880 data / hari

↓

≈ 1.051.200 data / tahun
```

Karena tabel `temperature_logs` akan tumbuh sangat cepat, strategi indexing menjadi sangat penting.

Pada skala yang lebih besar, tabel ini dapat dipartisi berdasarkan bulan atau tahun tanpa mengubah struktur domain.

---

# Design Decisions

## Decision

Memisahkan histori suhu, status perangkat, alert, dan notifikasi ke dalam tabel yang berbeda.

---

## Why?

- Menghindari duplikasi data.
- Mempermudah analisis histori.
- Mempermudah maintenance.
- Mendukung pengembangan fitur baru.
- Menjaga setiap tabel memiliki satu tanggung jawab.

---

## Trade-offs

- Jumlah tabel lebih banyak.
- Membutuhkan relasi antar tabel.
- Query menjadi sedikit lebih kompleks dibanding desain yang digabung.

---

# Future Improvements

Beberapa peningkatan yang dapat diterapkan pada database di masa depan:

- Table Partitioning untuk `temperature_logs`.
- Materialized View untuk dashboard.
- Read Replica untuk reporting.
- Timeseries Database (TimescaleDB).
- Archiving data lama.
- Background cleanup job.
- Data retention policy.

---

# Conclusion

Desain database CI-CSMS berfokus pada pemisahan tanggung jawab setiap tabel. `temperature_logs` berfungsi sebagai **Source of Truth**, `devices` menyimpan kondisi terbaru perangkat, `alerts` mencatat perubahan status sebagai business event, sedangkan `notification_logs` menyediakan histori pengiriman notifikasi.

Pendekatan ini menghasilkan struktur yang sederhana untuk MVP, namun tetap siap berkembang menjadi sistem monitoring skala produksi.
