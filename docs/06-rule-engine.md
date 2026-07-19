# Rule Engine

Dokumen ini menjelaskan bagaimana CI-CSMS menentukan kondisi sebuah perangkat berdasarkan data sensor yang diterima.

Rule Engine merupakan inti dari business logic sistem. Seluruh keputusan mengenai status perangkat dilakukan oleh komponen ini.

---

# Purpose

Rule Engine bertugas mengubah **raw temperature** menjadi **device state**.

Contoh:

```
Temperature

↓

-17.3°C

↓

WARNING
```

Sensor tidak pernah mengirim status.

Sensor hanya mengirim angka temperatur.

---

# Responsibilities

Rule Engine bertanggung jawab untuk:

- Mengevaluasi suhu terbaru.
- Menentukan status perangkat.
- Menghasilkan penyebab perubahan status.
- Mengembalikan hasil evaluasi ke Service Layer.

Rule Engine **tidak bertanggung jawab** untuk:

- Menyimpan data.
- Mengakses database.
- Mengirim notifikasi.
- Mengembalikan HTTP Response.

---

# Inputs

Rule Engine membutuhkan beberapa informasi.

```
Latest Temperature

+

Device Configuration

+

Current Device State

+

Recent Temperature History
```

Contoh:

```json
{
  "temperature": -17.4,
  "device": {
    "normalMinTemperature": -25,
    "normalMaxTemperature": -18,
    "state": "NORMAL"
  }
}
```

---

# Output

Rule Engine menghasilkan satu objek evaluasi.

```ts
{
  matched: true,
  state: "WARNING",
  cause: "HIGH_TEMPERATURE",
  reason: "Temperature exceeded the configured maximum threshold."
}
```

Output ini akan digunakan oleh Service Layer untuk menentukan langkah berikutnya.

---

# Evaluation Flow

```
Receive Temperature
        │
        ▼
Load Device Configuration
        │
        ▼
Execute Rule Engine
        │
        ▼
Evaluation Result
        │
        ▼
Compare Previous State
```

---

# Rule Evaluation Order

Rule dievaluasi berdasarkan prioritas.

```
OFFLINE
      │
      ▼
DEFROST
      │
      ▼
CRITICAL
      │
      ▼
WARNING
      │
      ▼
NORMAL
```

Mengapa?

Misalnya:

```
Temperature = -16°C
```

Nilai tersebut memenuhi:

```
WARNING
```

dan juga

```
CRITICAL
```

Yang dipilih adalah:

```
CRITICAL
```

karena memiliki prioritas lebih tinggi.

---

# Available Rules

## Normal Rule

Status:

```
NORMAL
```

Kondisi:

```
temperature >= normalMinTemperature

AND

temperature <= normalMaxTemperature
```

Contoh:

```
Normal Range

-25

↓

-18
```

Temperature:

```
-20
```

Hasil:

```
NORMAL
```

---

## Warning Rule

Status:

```
WARNING
```

Contoh:

```
Temperature

-17.6
```

Melewati batas maksimum normal tetapi belum masuk kondisi kritis.

---

## Critical Rule

Status:

```
CRITICAL
```

Contoh:

```
Temperature

-15
```

Menunjukkan kondisi yang membutuhkan tindakan segera.

---

## Offline Rule

Status:

```
OFFLINE
```

Kondisi:

```
Current Time

-

last_seen_at

>

offlineThreshold
```

Contoh:

```
Last Seen

10:00

Current Time

10:10

Threshold

5 Minutes
```

Hasil:

```
OFFLINE
```

---

## Defrost Rule

Status:

```
DEFROST
```

Karena sensor hanya mengirim temperatur, status defrost tidak dapat diketahui secara langsung.

Rule ini menggunakan pola perubahan suhu dalam beberapa menit terakhir.

Contoh:

```
-22

↓

-20

↓

-18

↓

-15

↓

-13

↓

-18

↓

-22
```

Pola tersebut dapat mengindikasikan proses defrost.

Implementasi detail dapat berubah sesuai kebutuhan bisnis.

---

# Rule Priority

```
Priority

1

↓

OFFLINE

2

↓

DEFROST

3

↓

CRITICAL

4

↓

WARNING

5

↓

NORMAL
```

Evaluasi berhenti ketika rule dengan prioritas tertinggi ditemukan.

---

# Rule Interface

Setiap rule memiliki kontrak yang sama.

```ts
interface Rule {
  evaluate(context): RuleResult | null;
}
```

Artinya setiap rule dapat diganti tanpa mengubah Rule Engine.

---

# Rule Result

Contoh struktur hasil evaluasi.

```ts
{
  matched: true,
  state: "WARNING",
  cause: "HIGH_TEMPERATURE",
  reason: "Temperature exceeded the maximum threshold."
}
```

---

# Rule Engine Structure

```
Rule Engine
     │
     ├── Offline Rule
     ├── Defrost Rule
     ├── Critical Rule
     ├── Warning Rule
     └── Normal Rule
```

Engine hanya bertugas menjalankan seluruh rule sesuai urutan prioritas.

---

# Evaluation Example

Device:

```
FREEZER-A
```

Configuration:

```
Normal Min

-25

Normal Max

-18
```

Incoming Temperature:

```
-17
```

Flow:

```
Offline Rule

No

↓

Defrost Rule

No

↓

Critical Rule

No

↓

Warning Rule

Yes

↓

Result

WARNING
```

---

# State Transition

Misalkan state sebelumnya:

```
NORMAL
```

Rule Engine menghasilkan:

```
WARNING
```

Maka:

```
NORMAL

↓

WARNING
```

Service Layer kemudian:

- Update Device State
- Create Alert
- Create Notification Log
- Dispatch Notification

Rule Engine sendiri tidak melakukan proses tersebut.

---

# Separation of Responsibilities

```
Rule Engine

↓

Evaluate Condition
```

```
Service

↓

Business Process
```

```
Repository

↓

Database
```

Setiap komponen hanya memiliki satu tanggung jawab.

---

# Why Modular Rules?

Misalkan perusahaan ingin menambah rule baru.

```
POWER_FAILURE
```

Cukup menambahkan:

```
PowerFailureRule
```

Rule Engine tidak perlu diubah secara besar-besaran.

---

# Why Rule Engine?

Tanpa Rule Engine:

```
if()

else if()

else if()

else if()

else if()

...
```

Business logic akan tersebar di Service.

Dengan Rule Engine:

```
Service

↓

Rule Engine

↓

Result
```

Service menjadi jauh lebih sederhana.

---

# Future Rules

Beberapa rule yang dapat ditambahkan di masa depan.

- High Humidity
- Low Humidity
- Power Failure
- Door Open Too Long
- Sensor Failure
- Compressor Failure
- Rapid Temperature Change
- Maintenance Mode

Semuanya dapat ditambahkan tanpa mengubah struktur Service maupun Repository.

---

# Architecture Decisions

## Decision

Menggunakan Rule Engine dengan kumpulan rule yang independen.

## Why?

- Mudah dikembangkan.
- Mudah diuji.
- Business logic terpusat.
- Setiap rule memiliki tanggung jawab yang jelas.
- Tidak membuat Service dipenuhi banyak kondisi `if` dan `else`.

## Trade-offs

- Jumlah file bertambah.
- Sedikit lebih kompleks dibanding evaluasi langsung di Service.
- Membutuhkan urutan prioritas yang jelas antar rule.

---

# Conclusion

Rule Engine merupakan inti dari proses pengambilan keputusan dalam CI-CSMS.

Dengan memisahkan evaluasi kondisi ke dalam kumpulan rule yang independen, sistem menjadi lebih fleksibel, mudah dipelihara, dan siap menerima perubahan kebutuhan bisnis tanpa memengaruhi layer lain seperti Service, Repository, maupun API.
